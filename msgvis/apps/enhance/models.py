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
    def feature_count(self):
        return self.features.count()

    @property
    def gensim_dictionary(self):
        if not hasattr(self, '_gensim_dict'):
            setattr(self, '_gensim_dict', self._make_gensim_dictionary())
        return getattr(self, '_gensim_dict')

    def get_feature_id(self, bow_index):
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

        for feature in self.features.all():
            self._index2id[feature.index] = feature.id
            gensim_dict.token2id[feature.text] = feature.index
            gensim_dict.dfs[feature.index] = feature.document_frequency

        logger.info("Dictionary contains %d features" % len(gensim_dict.token2id))

        return gensim_dict


    @classmethod
    def _create_from_texts(cls, tokenized_texts, name, dataset, settings, minimum_frequency=2):
        from gensim.corpora import Dictionary as GensimDictionary

        # build a dictionary of features
        logger.info("Creating features (including n-grams) from texts")
        gemsim_dictionary = GensimDictionary(tokenized_texts)

        # Remove extremely rare features
        logger.info("Features dictionary contains %d features. Filtering..." % len(gemsim_dictionary.token2id))
        gemsim_dictionary.filter_extremes(no_below=minimum_frequency, no_above=1, keep_n=None)
        gemsim_dictionary.compactify()
        logger.info("Features Dictionary contains %d features." % len(gemsim_dictionary.token2id))

        dict_model = cls(name=name,
                         dataset=dataset,
                         settings=settings)
        dict_model.save()

        dict_model._populate_from_gensim_dictionary(gemsim_dictionary)

        return dict_model


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


    def _vectorize_corpus(self, queryset, tokenizer):

        import math

        logger.info("Saving document features vectors in corpus.")

        total_documents = self.num_docs
        gdict = self.gensim_dictionary
        count = 0
        total_count = queryset.count()
        batch = []
        batch_size = 1000
        print_freq = 10000

        for msg in queryset.iterator():
            tokens = tokenizer.tokenize(msg)
            bow = gdict.doc2bow(tokens)

            for feature_index, feature_freq in bow:
                feature_id = Feature.objects.filter(index=feature_index).first()

                document_freq = gdict.dfs[feature_index]

                num_tokens = len(tokens)
                tf = float(feature_freq) / float(num_tokens)
                idf = math.log(total_documents / document_freq)
                tfidf = tf * idf
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


    def load_sparse_matrix(self, use_tfidf=True):

        message_id_list = []
        results = []

        messages = self.dataset.message_set.all()

        for msg in messages:
            message_id_list.append(msg.id)
            results.append(map(lambda x: x.to_tuple(use_tfidf), msg.feature_scores.filter(dictionary=self).all()))

        return message_id_list, results

    def load_to_scikit_learn_format(self, training_portion=1.00, use_tfidf=True):
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



    def do_training(self):
        data = self.load_to_scikit_learn_format(training_portion=1.00, use_tfidf=False)
        from sklearn import svm
        lin_clf = svm.LinearSVC()
        trainingInput = data['training']['X']
        trainingOutput = data['training']['y']

        lin_clf.fit(trainingInput, trainingOutput)

        # get predictions
        prediction = lin_clf.predict(trainingInput)
        distances = lin_clf.decision_function(trainingInput)

        if hasattr(lin_clf, "predict_proba"):
            prob = lin_clf.predict_proba(trainingInput)[:, 1]
        else:  # use decision function
            prob = lin_clf.decision_function(trainingInput)
            min = prob.min()
            max = prob.max()
            prob = \
                (prob - min) / (max - min)

        results = {
            'codes': [],
            'features': [],
            'train_id': data['training']['id'],
            'test_id': data['testing']['id'],
            'accuracy': {
                'training': lin_clf.score(data['training']['X'], data['training']['y']),
                'testing': 0.0 # lin_clf.score(data['testing']['X'], data['testing']['y'])
            },
            'prediction': prediction,
            'probabilities': prob
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

    def add_a_feature(self, text, source='S'):
        # TODO: implement feature add
        pass


class Feature(models.Model):
    dictionary = models.ForeignKey(Dictionary, related_name='features')
    index = models.IntegerField()
    text = base_models.Utf8CharField(max_length=150)
    document_frequency = models.IntegerField()

    messages = models.ManyToManyField(Message, through='MessageFeature', related_name='features')

    SOURCE_CHOICES = (
        ('S', 'System'),
        ('U', 'User'),
    )
    source = models.CharField(max_length=1, choices=SOURCE_CHOICES, default='S')

    def __repr__(self):
        return self.text

    def __unicode__(self):
        return self.__repr__()


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
    def related_features(self):
        return TweetWord.objects.filter(dataset=self.dataset, text=self.text).all()

    @property
    def all_messages(self):
        queryset = self.dataset.message_set.all()
        queryset = queryset.filter(utils.levels_or("tweet_words__id", map(lambda x: x.id, self.related_features)))
        return queryset

class TweetWordMessageConnection(models.Model):
    message = models.ForeignKey(Message, related_name="tweetword_connections")
    tweet_word = models.ForeignKey(TweetWord, related_name="tweetword_connections")
    order = models.IntegerField()

    class Meta:
        ordering = ["message", "order", ]
        unique_together = ('message', 'tweet_word', 'order', )


