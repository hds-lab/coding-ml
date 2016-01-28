from django.db import models
from django.conf import settings
import random
import codecs
import math

import scipy.sparse
import numpy
from operator import itemgetter

from fields import PositiveBigIntegerField
from msgvis.apps.corpus.models import Message, Dataset
from msgvis.apps.base import models as base_models
from msgvis.apps.corpus import utils

from msgvis.apps.enhance.utils import check_or_create_dir

# Create your models here.



# import the logging library
import logging

# Get an instance of a logger
logger = logging.getLogger(__name__)


class Dictionary(models.Model):
    name = models.CharField(max_length=100)
    dataset = models.ForeignKey(Dataset, related_name="dictionary", null=True, blank=True, default=None)
    settings = models.TextField()

    time = models.DateTimeField(auto_now_add=True)

    num_docs = PositiveBigIntegerField(default=0)
    num_pos = PositiveBigIntegerField(default=0)
    num_nnz = PositiveBigIntegerField(default=0)

    @property
    def word_count(self):
        return self.words.count()

    @property
    def feature_count(self):
        return self.features.count()

    @property
    def gensim_dictionary(self):
        if not hasattr(self, '_gensim_dict'):
            setattr(self, '_gensim_dict', self._make_gensim_dictionary())
        return getattr(self, '_gensim_dict')

    def get_word_id(self, bow_index):
        if not hasattr(self, '_index2id'):
            g = self.gensim_dictionary
        try:
            return self._index2id[bow_index]
        except KeyError:
            return None

    def _make_gensim_dictionary(self):

        logger.info("Building gensim dictionary from database")

        setattr(self, '_index2id', {})

        from gensim import corpora

        gensim_dict = corpora.Dictionary()
        gensim_dict.num_docs = self.num_docs
        gensim_dict.num_pos = self.num_pos
        gensim_dict.num_nnz = self.num_nnz

        for word in self.words.all():
            self._index2id[word.index] = word.id
            gensim_dict.token2id[word.text] = word.index
            gensim_dict.dfs[word.index] = word.document_frequency

        logger.info("Dictionary contains %d words" % len(gensim_dict.token2id))

        return gensim_dict

    def _populate_from_gensim_dictionary(self, gensim_dict):

        self.num_docs = gensim_dict.num_docs
        self.num_pos = gensim_dict.num_pos
        self.num_nnz = gensim_dict.num_nnz
        self.save()

        logger.info("Saving gensim dictionary '%s' in the database" % self.name)

        batch = []
        count = 0
        print_freq = 10000
        batch_size = 1000
        total_words = len(gensim_dict.token2id)

        for token, id in gensim_dict.token2id.iteritems():
            word = Word(dictionary=self,
                        text=token,
                        index=id,
                        document_frequency=gensim_dict.dfs[id])
            batch.append(word)
            count += 1

            if len(batch) > batch_size:
                Word.objects.bulk_create(batch)
                batch = []

                if settings.DEBUG:
                    # prevent memory leaks
                    from django.db import connection

                    connection.queries = []

            if count % print_freq == 0:
                logger.info("Saved %d / %d words in the database dictionary" % (count, total_words))

        if len(batch):
            Word.objects.bulk_create(batch)
            count += len(batch)

            logger.info("Saved %d / %d words in the database dictionary" % (count, total_words))

        return self

    @classmethod
    def _create_from_texts(cls, tokenized_texts, name, dataset, settings, minimum_frequency=2):
        from gensim.corpora import Dictionary as GensimDictionary

        # build a dictionary
        logger.info("Building a dictionary from texts")
        dictionary = GensimDictionary(tokenized_texts)

        # Remove extremely rare words
        logger.info("Dictionary contains %d words. Filtering..." % len(dictionary.token2id))
        dictionary.filter_extremes(no_below=minimum_frequency, no_above=1, keep_n=None)
        dictionary.compactify()
        logger.info("Dictionary contains %d words." % len(dictionary.token2id))

        dict_model = cls(name=name,
                         dataset=dataset,
                         settings=settings)
        dict_model.save()

        dict_model._populate_from_gensim_dictionary(dictionary)

        return dict_model

    # TODO: generalize bigram, trigram
    def _create_features_from_texts(self, dict_model, tokenized_texts, name, queryset, minimum_frequency=2):
        from gensim.corpora import Dictionary as GensimDictionary
        from gensim.models import Phrases        

        tokenized_texts_trigrams = []

        bigram = Phrases()
        for t in tokenized_texts:
            bigram.add_vocab([t])

        trigram = Phrases(bigram[tokenized_texts])  

        for t in tokenized_texts:
            trigram.add_vocab([bigram[t]])

        for t in tokenized_texts:
            tokenized_texts_trigrams.append(trigram[bigram[t]])

        # build a dictionary of features
        logger.info("Creating features (including n-grams) from texts")
        dictionary = GensimDictionary(tokenized_texts_trigrams)

        # Remove extremely rare features
        logger.info("Features dictionary contains %d features. Filtering..." % len(dictionary.token2id))
        dictionary.filter_extremes(no_below=minimum_frequency, no_above=1, keep_n=None)
        dictionary.compactify()
        logger.info("Features Dictionary contains %d features." % len(dictionary.token2id))

        dict_model._populate_features_from_gensim_dictionary(dictionary)
        dict_model._vectorize_features_from_gensim_dictionary(dictionary, queryset, tokenized_texts, trigram, bigram)

        return dict_model

    def _populate_features_from_gensim_dictionary(self, gensim_dict):

        logger.info("Saving gensim dictionary of features '%s' in the database" % self.name)

        batch = []
        count = 0
        print_freq = 10000
        batch_size = 1000
        total_features = len(gensim_dict.token2id)

        for token, id in gensim_dict.token2id.iteritems():
            feature = Feature(dictionary=self,
                        text=token,
                        index=id,
                        document_frequency=gensim_dict.dfs[id])
            batch.append(feature)
            count += 1

            if len(batch) > batch_size:
                Feature.objects.bulk_create(batch)
                batch = []

                if settings.DEBUG:
                    # prevent memory leaks
                    from django.db import connection

                    connection.queries = []

            if count % print_freq == 0:
                logger.info("Saved %d / %d features in the database dictionary" % (count, total_features))

        if len(batch):
            Feature.objects.bulk_create(batch)
            count += len(batch)

            logger.info("Saved %d / %d features in the database dictionary" % (count, total_features))

        return self

    def _vectorize_features_from_gensim_dictionary(self, gdict, queryset, tokenizer, trigram, bigram):

        import math

        logger.info("Saving document features vectors in corpus.")

        total_documents = self.num_docs
        count = 0
        total_count = queryset.count()
        batch = []
        batch_size = 1000
        print_freq = 10000

        for msg in queryset.iterator():
            tokens_raw = tokenizer.tokenize(msg)
            tokens = trigram[bigram[tokens_raw]]
            bow = gdict.doc2bow(tokens)

            for feature_index, feature_freq in bow:
                feature_id = Feature.objects.filter(index=feature_index).first()

                document_freq = gdict.dfs[feature_index]

                # Not sure why tf is calculated like the final version
                num_tokens = len(tokens)
                tf = float(feature_freq) / float(num_tokens)
                idf = math.log(total_documents / document_freq)
                tfidf = tf * idf
                #tfidf = word_freq * math.log(total_documents / document_freq)
                batch.append(MessageFeature(dictionary=self,
                                         feature=feature_id,
                                         feature_index=feature_index,
                                         count=feature_freq,
                                         tfidf=tfidf,
                                         message=msg))
            count += 1

            if len(batch) > batch_size:
                MessageFeature.objects.bulk_create(batch)
                batch = []

                if settings.DEBUG:
                    # prevent memory leaks
                    from django.db import connection

                    connection.queries = []

            if count % print_freq == 0:
                logger.info("Saved feature-vectors for %d / %d documents" % (count, total_count))

        if len(batch):
            MessageFeature.objects.bulk_create(batch)
            logger.info("Saved feature-vectors for %d / %d documents" % (count, total_count))

        logger.info("Created %d feature vector entries" % count)

    def _vectorize_corpus(self, queryset, tokenizer):

        import math

        logger.info("Saving document word vectors in corpus.")

        total_documents = self.num_docs
        gdict = self.gensim_dictionary
        count = 0
        total_count = queryset.count()
        batch = []
        batch_size = 1000
        print_freq = 10000

        for msg in queryset.iterator():
            #text = msg.text
            #bow = gdict.doc2bow(tokenizer.tokenize(text))
            tokens = tokenizer.tokenize(msg)
            bow = gdict.doc2bow(tokens)

            for word_index, word_freq in bow:
                word_id = self.get_word_id(word_index)
                document_freq = gdict.dfs[word_index]

                # Not sure why tf is calculated like the final version
                num_tokens = len(tokens)
                tf = float(word_freq) / float(num_tokens)
                idf = math.log(total_documents / document_freq)
                tfidf = tf * idf
                #tfidf = word_freq * math.log(total_documents / document_freq)
                batch.append(MessageWord(dictionary=self,
                                         word_id=word_id,
                                         word_index=word_index,
                                         count=word_freq,
                                         tfidf=tfidf,
                                         message=msg))
            count += 1

            if len(batch) > batch_size:
                MessageWord.objects.bulk_create(batch)
                batch = []

                if settings.DEBUG:
                    # prevent memory leaks
                    from django.db import connection

                    connection.queries = []

            if count % print_freq == 0:
                logger.info("Saved word-vectors for %d / %d documents" % (count, total_count))

        if len(batch):
            MessageWord.objects.bulk_create(batch)
            logger.info("Saved word-vectors for %d / %d documents" % (count, total_count))

        logger.info("Created %d word vector entries" % count)


    def _build_lda(self, name, corpus, num_topics=30, words_to_save=200, multicore=True):
        from gensim.models import LdaMulticore, LdaModel

        gdict = self.gensim_dictionary

        if multicore:
            lda = LdaMulticore(corpus=corpus,
                               num_topics=num_topics,
                               workers=3,
                               id2word=gdict)
        else:
            lda = LdaModel(corpus=corpus,
                               num_topics=num_topics,
                               id2word=gdict)

        model = TopicModel(name=name, dictionary=self)
        model.save()

        topics = []
        for i in range(num_topics):
            topic = lda.show_topic(i, topn=words_to_save)
            alpha = lda.alpha[i]

            topicm = Topic(model=model, name="?", alpha=alpha, index=i)
            topicm.save()
            topics.append(topicm)

            words = []
            for prob, word_text in topic:
                word_index = gdict.token2id[word_text]
                word_id = self.get_word_id(word_index)
                tw = TopicWord(topic=topicm,
                               word_id=word_id, word_index=word_index,
                               probability=prob)
                words.append(tw)
            TopicWord.objects.bulk_create(words)

            most_likely_word_scores = topicm.word_scores\
                .order_by('-probability')\
                .prefetch_related('word')
                
            topicm.name = ', '.join([score.word.text for score in most_likely_word_scores[:3]])
            topicm.save()

            if settings.DEBUG:
                # prevent memory leaks
                from django.db import connection

                connection.queries = []

        model.save_to_file(lda)

        return (model, lda)

    def _apply_lda(self, model, corpus, lda=None):

        if lda is None:
            # recover the lda
            lda = model.load_from_file()

        total_documents = len(corpus)
        count = 0
        batch = []
        batch_size = 1000
        print_freq = 10000

        topics = list(model.topics.order_by('index'))

        # Go through the bows and get their topic mixtures
        for bow in corpus:
            mixture = lda[bow]
            message_id = corpus.current_message_id

            for topic_index, prob in mixture:
                topic = topics[topic_index]
                itemtopic = MessageTopic(topic_model=model,
                                         topic=topic,
                                         message_id=message_id,
                                         probability=prob)
                batch.append(itemtopic)

            count += 1

            if len(batch) > batch_size:
                MessageTopic.objects.bulk_create(batch)
                batch = []

                if settings.DEBUG:
                    # prevent memory leaks
                    from django.db import connection

                    connection.queries = []

            if count % print_freq == 0:
                logger.info("Saved topic-vectors for %d / %d documents" % (count, total_documents))

        if len(batch):
            MessageTopic.objects.bulk_create(batch)
            logger.info("Saved topic-vectors for %d / %d documents" % (count, total_documents))

    def _evaluate_lda(self, model, corpus, lda=None):

        if lda is None:
            # recover the lda
            lda = model.load_from_file()

        logger.info("Calculating model perplexity on entire corpus...")
        model.perplexity = lda.log_perplexity(corpus)
        logger.info("Perplexity: %f" % model.perplexity)
        model.save()

    def load_sparse_matrix(self, use_tfidf=True):

        message_id_list = []
        results = []

        messages = self.dataset.message_set.all()

        for msg in messages:
            message_id_list.append(msg.id)
            results.append(map(lambda x: x.to_tuple(use_tfidf), msg.word_scores.filter(dictionary=self).all()))

        return message_id_list, results

    def load_to_scikit_learn_format(self, training_portion=0.80, use_tfidf=True):
        messages = map(lambda x: x, self.dataset.message_set.all().order_by('id'))
        count = len(messages)
        training_data_num = int(round(float(count) * training_portion))
        testing_data_num = count - training_data_num
        feature_num = self.features.count()
        codes = self.dataset.message_set.select_related('code').values('code_id', 'code__text').distinct()
        code_num = codes.count()

        random.shuffle(messages)

        training_data = messages[:training_data_num]
        testing_data = messages[training_data_num:]

        data = {
            'training': {
                'id': [],
                'X': numpy.zeros((training_data_num, feature_num), dtype=numpy.float64),
                'y': [],
                'group_by_codes': map(lambda x: [], range(code_num)),
                'mean': numpy.zeros((code_num, feature_num)),
                'var': numpy.zeros((code_num, feature_num)),
            },
            'testing': {
                'id': [],
                'X': numpy.zeros((testing_data_num, feature_num), dtype=numpy.float64),
                'y': [],
                'group_by_codes': map(lambda x: [], range(code_num)),
                'mean': numpy.zeros((code_num, feature_num)),
                'var': numpy.zeros((code_num, feature_num)),
            },
            'meta': {
                'features': [],
                'codes': []
            }
        }
        for idx, msg in enumerate(training_data):
            code_id = msg.code.id if msg.code else 0
            for feature in msg.feature_scores.filter(dictionary=self).all():
                data['training']['X'][idx, feature.feature_index] = feature.tfidf if use_tfidf else feature.count
            data['training']['group_by_codes'][code_id - 1].append(data['training']['X'][idx])

            data['training']['y'].append(code_id)
            data['training']['id'].append(msg.id)

        for idx, msg in enumerate(testing_data):
            code_id = msg.code.id if msg.code else 0
            for feature in msg.feature_scores.filter(dictionary=self).all():
                data['testing']['X'][idx, feature.feature_index] = feature.tfidf if use_tfidf else feature.count

            data['testing']['group_by_codes'][code_id - 1].append(data['testing']['X'][idx])
            data['testing']['y'].append(code_id)
            data['testing']['id'].append(msg.id)


        for code in codes:
            data['meta']['codes'].append({'index': code['code_id'] - 1,
                                          'text': code['code__text']})
            code_idx = code['code_id'] - 1
            data['training']['mean'][code_idx] = numpy.mean(data['training']['group_by_codes'][code_idx], axis=0)
            data['training']['var'][code_idx] = numpy.var(data['training']['group_by_codes'][code_idx], axis=0)
            data['testing']['mean'][code_idx] = numpy.mean(data['testing']['group_by_codes'][code_idx], axis=0)
            data['testing']['var'][code_idx] = numpy.var(data['testing']['group_by_codes'][code_idx], axis=0)

        for feature in self.features.all().order_by('index'):
            data['meta']['features'].append({'index': feature.index,
                                          'text': (feature.text).replace("_", " "),
                                          'count': feature.document_frequency})

        return data


    def dump_to_libsvm(self, output_path, training_portion=0.80, use_tfidf=True):

        check_or_create_dir(output_path)

        filenames = {
            'training': {
                'data': 'training.data',
                'id': 'training.id',
            },
            'testing': {
                'data': 'testing.data',
                'id': 'testing.id',
                'gt': 'testing.gt'
            },
            'meta': {
                'features': 'features.list',
                'codes': 'code.list'
            }
        }

        # extend to full path
        for type in filenames:
            for key in filenames[type]:
                filenames[type][key] = output_path + '/' + filenames[type][key]

        messages = map(lambda x: x, self.dataset.message_set.all())
        count = len(messages)
        training_data_num = int(round(float(count) * training_portion))
        testing_data_num = count - training_data_num

        random.shuffle(messages)

        training_data = messages[:training_data_num]
        testing_data = messages[training_data_num:]

        try:
            with open(filenames['training']['data'], mode='w') as data_fp:
                with codecs.open(filenames['training']['id'], encoding='utf-8', mode='w') as id_fp:
                    for msg in training_data:
                        code_id = msg.code.id if msg.code else 0
                        print >> data_fp, "%d %s" %(code_id, " ".join(map(lambda x: x.to_libsvm_tuple(use_tfidf), msg.word_scores.filter(dictionary=self).all())))
                        print >> id_fp, "%d %s" % (msg.id, msg.text.replace('\n', ' '))

            with open(filenames['testing']['data'], mode='w') as data_fp:
                with codecs.open(filenames['testing']['id'], encoding='utf-8', mode='w') as id_fp:
                    #with open(filenames['testing']['gt'], mode='w') as gt_fp:
                    for msg in testing_data:
                        code_id = msg.code.id if msg.code else 0
                        print >> data_fp, "%d %s" %(code_id, " ".join(map(lambda x: x.to_libsvm_tuple(use_tfidf), msg.word_scores.filter(dictionary=self).all())))
                        print >> id_fp, "%d %s" % (msg.id, msg.text.replace('\n', ' '))
                            #print >> gt_fp, "%d" % code_id

            with open(filenames['meta']['codes'], mode='w') as code_fp:
                codes = self.dataset.message_set.select_related('code').values('code_id', 'code__text').distinct()
                for code in codes:
                    if code['code_id'] is None:
                        code['code_id'] = 0
                        code['code_text'] = "No code"
                    print >> code_fp, "%d %s" %(code['code_id'], code['code__text'])

            with codecs.open(filenames['meta']['features'], encoding='utf-8', mode='w') as feature_fp:
                for word in self.words.all():
                    print >> feature_fp, "%d %s" %(word.id, word.text)
        except:
            import traceback
            traceback.print_exc()
            return False

        return True

    def do_training(self):
        data = self.load_to_scikit_learn_format(training_portion=0.50, use_tfidf=False)
        from sklearn import svm
        lin_clf = svm.LinearSVC()
        lin_clf.fit(data['training']['X'], data['training']['y'])

        results = {
            'codes': [],
            'features': [],
            'train_id': data['training']['id'],
            'test_id': data['testing']['id'],
            'accuracy': {
                'training': lin_clf.score(data['training']['X'], data['training']['y']),
                'testing': lin_clf.score(data['testing']['X'], data['testing']['y'])
            }
        }

        for code in data['meta']['codes']:
            results['codes'].append({
                'index': code['index'],
                'text': code['text'],
                'train_count': len(data['training']['group_by_codes'][code['index']]),
                'test_count': len(data['testing']['group_by_codes'][code['index']]),
                'domain': [0, 0]
            })


        order = numpy.zeros(lin_clf.coef_.shape)
        for code in data['meta']['codes']:
            cl = sorted(map(lambda x: x, enumerate(lin_clf.coef_[code['index']])), key=itemgetter(1), reverse=True)
            for idx, item in enumerate(cl):
                order[code['index']][item[0]] = idx


        for feature in data['meta']['features']:
            in_top_features = 0

            row = {
                'feature_index': feature['index'],
                'feature': feature['text'],
                'count': feature['count'],
                'codes': {}
            }

            for idx, code in enumerate(data['meta']['codes']):
                row['codes'][code['text']] = {
                    'weight': lin_clf.coef_[code['index']][feature['index']],
                    'mean': data['training']['mean'][code['index']][feature['index']],
                    'var': data['training']['var'][code['index']][feature['index']],
                    'order': order[code['index']][feature['index']]
                }
                max_domain = data['training']['mean'][code['index']][feature['index']] + 3 * math.sqrt(data['training']['var'][code['index']][feature['index']])
                if max_domain > results['codes'][idx]['domain'][1]:
                   results['codes'][idx]['domain'][1] = max_domain
                in_top_features += 1 if order[code['index']][feature['index']] < 20 else 0
            row['in_top_features'] = in_top_features

            results['features'].append(row)

        return results

class Word(models.Model):
    dictionary = models.ForeignKey(Dictionary, related_name='words')
    index = models.IntegerField()
    text = base_models.Utf8CharField(max_length=100)
    document_frequency = models.IntegerField()

    messages = models.ManyToManyField(Message, through='MessageWord', related_name='words')

    def __repr__(self):
        return self.text

    def __unicode__(self):
        return self.__repr__()

class Feature(models.Model):
    dictionary = models.ForeignKey(Dictionary, related_name='features')
    index = models.IntegerField()
    text = base_models.Utf8CharField(max_length=150)
    document_frequency = models.IntegerField()

    messages = models.ManyToManyField(Message, through='MessageFeature', related_name='features')

    def __repr__(self):
        return self.text

    def __unicode__(self):
        return self.__repr__()


class TopicModel(models.Model):
    dictionary = models.ForeignKey(Dictionary)

    name = models.CharField(max_length=100)
    description = models.CharField(max_length=200)

    time = models.DateTimeField(auto_now_add=True)
    perplexity = models.FloatField(default=0)

    def load_from_file(self):
        from gensim.models import LdaMulticore

        return LdaMulticore.load("lda_out_%d.model" % self.id)

    def save_to_file(self, gensim_lda):
        gensim_lda.save("lda_out_%d.model" % self.id)

    def get_probable_topic(self, message):
        """For this model, get the most likely topic for the message."""
        message_topics = message.topic_probabilities\
            .filter(topic_model=self)\
            .only('topic', 'probability')

        max_prob = -100000
        probable_topic = None
        for mt in message_topics:
            if mt.probability > max_prob:
                probable_topic = mt.topic
                max_prob = mt.probability

        return probable_topic


class Topic(models.Model):
    model = models.ForeignKey(TopicModel, related_name='topics')
    name = base_models.Utf8CharField(max_length=100)
    description = base_models.Utf8CharField(max_length=200)
    index = models.IntegerField()
    alpha = models.FloatField()

    messages = models.ManyToManyField(Message, through='MessageTopic', related_name='topics')
    words = models.ManyToManyField(Word, through='TopicWord', related_name='topics')


class TopicWord(models.Model):
    word = models.ForeignKey(Word, related_name='topic_scores')
    topic = models.ForeignKey(Topic, related_name='word_scores')

    word_index = models.IntegerField()
    probability = models.FloatField()


class MessageWord(models.Model):
    class Meta:
        index_together = (
            ('dictionary', 'message'),
            ('message', 'word'),
        )

    dictionary = models.ForeignKey(Dictionary, db_index=False)

    word = models.ForeignKey(Word, related_name="message_scores")
    message = models.ForeignKey(Message, related_name='word_scores', db_index=False)

    word_index = models.IntegerField()
    count = models.FloatField()
    tfidf = models.FloatField()

    def to_tuple(self, use_tfidf=True):
        return (self.word_index, self.tfidf) if use_tfidf else (self.dic_token_index, self.count)

    def to_libsvm_tuple(self, use_tfidf=True):
        if use_tfidf:
            return"%d:%f" %(int(self.word_id), float(self.tfidf))
        else:
            return"%d:%f" %(int(self.word_id), float(self.count))

class MessageFeature(models.Model):
    class Meta:
        index_together = (
            ('message', 'feature'),
        )

    dictionary = models.ForeignKey(Dictionary, db_index=False)

    feature = models.ForeignKey(Feature, related_name="message_scores")
    message = models.ForeignKey(Message, related_name='feature_scores', db_index=False)

    feature_index = models.IntegerField()
    count = models.FloatField()
    tfidf = models.FloatField()

    def to_tuple(self, use_tfidf=True):
        return (self.feature_index, self.tfidf) if use_tfidf else (self.dic_token_index, self.count)

    def to_libsvm_tuple(self, use_tfidf=True):
        if use_tfidf:
            return"%d:%f" %(int(self.feature_id), float(self.tfidf))
        else:
            return"%d:%f" %(int(self.feature_id), float(self.count))


class MessageTopic(models.Model):
    class Meta:
        index_together = (
            ('topic_model', 'message'),
            ('message', 'topic'),
        )

    topic_model = models.ForeignKey(TopicModel, db_index=False)

    topic = models.ForeignKey(Topic, related_name='message_probabilities')
    message = models.ForeignKey(Message, related_name="topic_probabilities", db_index=False)

    probability = models.FloatField()


    @classmethod
    def get_examples(cls, topic):
        examples = cls.objects.filter(topic=topic)
        return examples.order_by('-probability')


def set_message_sentiment(message, save=True):
    message.sentiment = int(round(textblob.TextBlob(message.text).sentiment.polarity))
    if save:
        message.save()

class TweetWord(models.Model):
    dataset = models.ForeignKey(Dataset, related_name="tweet_words", null=True, blank=True, default=None)
    original_text = base_models.Utf8CharField(max_length=100, db_index=True, blank=True, default="")
    pos = models.CharField(max_length=4, null=True, blank=True, default="")
    text = base_models.Utf8CharField(max_length=100, db_index=True, blank=True, default="")
    messages = models.ManyToManyField(Message, related_name='tweet_words', through="TweetWordMessageConnection")

    def __repr__(self):
        return self.text

    def __unicode__(self):
        return self.__repr__()

    @property
    def related_words(self):
        return TweetWord.objects.filter(dataset=self.dataset, text=self.text).all()

    @property
    def all_messages(self):
        queryset = self.dataset.message_set.all()
        queryset = queryset.filter(utils.levels_or("tweet_words__id", map(lambda x: x.id, self.related_words)))
        return queryset

class TweetWordMessageConnection(models.Model):
    message = models.ForeignKey(Message)
    tweet_word = models.ForeignKey(TweetWord)
    order = models.IntegerField()

    class Meta:
        ordering = ["order"]
