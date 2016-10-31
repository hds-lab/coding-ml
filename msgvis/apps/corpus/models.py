import operator
from django.db import models
from django.db.models import Q
from caching.base import CachingManager, CachingMixin

from django.contrib.auth.models import User

from msgvis.apps.base import models as base_models
from msgvis.apps.corpus import utils

import numpy


class Code(models.Model):
    """A code of a message"""

    text = base_models.Utf8CharField(max_length=200)
    """The text of the code"""

    def __repr__(self):
        return self.text

    def __unicode__(self):
        return self.__repr__()

    def get_definition(self, source):
        if not self.definitions.filter(source=source).exists():
            return None

        definition = self.definitions.filter(source=source, valid=True).order_by("-last_updated").first()
        return {
            "code_id": self.id,
            "code_text": self.text,
            "source": source,
            "text": definition.text,
            "examples": definition.examples
        }

class Dataset(models.Model):
    """A top-level dataset object containing messages."""

    name = models.CharField(max_length=150)
    """The name of the dataset"""

    description = models.TextField()
    """A description of the dataset."""

    created_at = models.DateTimeField(auto_now_add=True)
    """The :py:class:`datetime.datetime` when the dataset was created."""

    start_time = models.DateTimeField(null=True, default=None, blank=True)
    """The time of the first real message in the dataset"""

    end_time = models.DateTimeField(null=True, default=None, blank=True)
    """The time of the last real message in the dataset"""

    has_prefetched_images = models.BooleanField(default=False)

    @property
    def message_count(self):
        return self.get_message_set().count()

    def __unicode__(self):
        return self.name

    def get_message_set(self):
        return self.message_set.filter(time__isnull=False).all()

    def get_non_master_message_set(self):
        messages = self.message_set.filter(time__isnull=False)
        messages = messages.exclude(code_assignments__source__username="master")

        return messages

    def get_master_message_set(self):
        messages = self.message_set.filter(time__isnull=False)
        return messages.filter(code_assignments__source__username="master")

    def get_dictionary(self):
        dictionary = self.dictionary.all()
        if len(dictionary) > 0:
            dictionary = dictionary[0]
            return dictionary
        return None


class MessageType(models.Model):
    """The type of a message, e.g. retweet, reply, original, system..."""

    name = models.CharField(max_length=100, unique=True)
    """The name of the message type"""

    def __unicode__(self):
        return self.name


class Language(CachingMixin, models.Model):
    """Represents the language of a message or a user"""

    code = models.SlugField(max_length=10, unique=True)
    """A short language code like 'en'"""

    name = models.CharField(max_length=100)
    """The full name of the language"""

    objects = CachingManager()

    def __unicode__(self):
        return "%s:%s" % (self.code, self.name)


class Url(models.Model):
    """A url from a message"""

    domain = models.CharField(max_length=100, db_index=True)
    """The root domain of the url"""

    short_url = models.CharField(max_length=250, blank=True)
    """A shortened url"""

    full_url = models.TextField()
    """The full url"""


class Hashtag(models.Model):
    """A hashtag in a message"""

    text = base_models.Utf8CharField(max_length=100, db_index=True)
    """The text of the hashtag, without the hash"""


class Media(models.Model):
    """
    Linked media, e.g. photos or videos.
    """

    type = models.CharField(max_length=50)
    """The kind of media this is."""

    media_url = models.CharField(max_length=250)
    """A url where the media may be accessed"""


class Timezone(CachingMixin, models.Model):
    """
    The timezone of a message or user
    """

    olson_code = models.CharField(max_length=40, null=True, blank=True, default=None)
    """The timezone code from pytz."""

    name = models.CharField(max_length=150, db_index=True)
    """Another name for the timezone, perhaps the country where it is located?"""

    objects = CachingManager()


class Person(models.Model):
    """
    A person who sends messages in a dataset.
    """

    class Meta:
        index_together = (
            ('dataset', 'original_id')  # used by the importer
        )

    dataset = models.ForeignKey(Dataset)
    """Which :class:`Dataset` this person belongs to"""

    original_id = models.BigIntegerField(null=True, blank=True, default=None)
    """An external id for the person, e.g. a user id from Twitter"""

    username = base_models.Utf8CharField(max_length=150, null=True, blank=True, default=None)
    """Username is a short system-y name."""

    full_name = base_models.Utf8CharField(max_length=250, null=True, blank=True, default=None)
    """Full name is a longer user-friendly name"""

    language = models.ForeignKey(Language, null=True, blank=True, default=None)
    """The person's primary :class:`Language`"""

    message_count = models.PositiveIntegerField(blank=True, default=0)
    """The number of messages the person produced"""

    replied_to_count = models.PositiveIntegerField(blank=True, default=0)
    """The number of times the person's messages were replied to"""

    shared_count = models.PositiveIntegerField(blank=True, default=0)
    """The number of times the person's messages were shared or retweeted"""

    mentioned_count = models.PositiveIntegerField(blank=True, default=0)
    """The number of times the person was mentioned in other people's messages"""

    friend_count = models.PositiveIntegerField(blank=True, default=0)
    """The number of people this user has connected to"""

    follower_count = models.PositiveIntegerField(blank=True, default=0)
    """The number of people who have connected to this person"""

    profile_image_url = models.TextField(null=True, blank=True, default="")
    """The person's profile image url"""

    def __unicode__(self):
        return self.username

    @property
    def profile_image_processed_url(self):
        url = self.profile_image_url
        if url != "" and self.dataset.has_prefetched_images:
            pattern = re.compile('/[_\.\-\w\d]+\.([\w]+)$')
            results = pattern.search(url)
            if results:
                suffix = results.groups()[0]
                url = "profile_" + str(self.original_id) + "." + suffix

        return url


class Message(models.Model):
    """
    The Message is the central data entity for the dataset.
    """
    class Meta:
        index_together = (
            ('dataset', 'original_id'),  # used by importer
            ('dataset', 'time'),
        )

    dataset = models.ForeignKey(Dataset)
    """Which :class:`Dataset` the message belongs to"""

    original_id = models.BigIntegerField(null=True, blank=True, default=None)
    """An external id for the message, e.g. a tweet id from Twitter"""

    type = models.ForeignKey(MessageType, null=True, blank=True, default=None)
    """The :class:`MessageType` Message type: retweet, reply, origin..."""

    sender = models.ForeignKey(Person, null=True, blank=True, default=None)
    """The :class:`Person` who sent the message"""

    time = models.DateTimeField(null=True, blank=True, default=None)
    """The :py:class:`datetime.datetime` (in UTC) when the message was sent"""

    language = models.ForeignKey(Language, null=True, blank=True, default=None)
    """The :class:`Language` of the message."""

    timezone = models.ForeignKey(Timezone, null=True, blank=True, default=None)
    """The :class:`Timezone` of the message."""

    replied_to_count = models.PositiveIntegerField(blank=True, default=0)
    """The number of replies this message received."""

    shared_count = models.PositiveIntegerField(blank=True, default=0)
    """The number of times this message was shared or retweeted."""

    contains_hashtag = models.BooleanField(blank=True, default=False)
    """True if the message has a :class:`Hashtag`."""

    contains_url = models.BooleanField(blank=True, default=False)
    """True if the message has a :class:`Url`."""

    contains_media = models.BooleanField(blank=True, default=False)
    """True if the message has any :class:`Media`."""

    contains_mention = models.BooleanField(blank=True, default=False)
    """True if the message mentions any :class:`Person`."""

    urls = models.ManyToManyField(Url, null=True, blank=True, default=None)
    """The set of :class:`Url` in the message."""

    hashtags = models.ManyToManyField(Hashtag, null=True, blank=True, default=None)
    """The set of :class:`Hashtag` in the message."""

    media = models.ManyToManyField(Media, null=True, blank=True, default=None)
    """The set of :class:`Media` in the message."""

    mentions = models.ManyToManyField(Person, related_name="mentioned_in", null=True, blank=True, default=None)
    """The set of :class:`Person` mentioned in the message."""

    text = base_models.Utf8TextField(null=True, blank=True, default="")
    """The actual text of the message."""

    @property
    def embedded_html(self):
        #return utils.get_embedded_html(self.original_id)
        return utils.render_html_tag(self.text)

    @property
    def media_url(self):
        url = ""
        if self.contains_media:
            url = self.media.all()[0].media_url
            if self.dataset.has_prefetched_images:
                pattern = re.compile('/([_\.\-\w\d]+\.[\w]+)$')
                results = pattern.search(url)
                if results:
                    url = results.groups()[0]
        return url


    def __repr__(self):
        return str(self.time) + " || " + self.text

    def __unicode__(self):
        return self.__repr__()

    def add_comment(self, text, source):
        index = self.get_last_comment_index() + 1
        comment = Comment(index=index,
                          message=self,
                          source=source,
                          text=text)
        comment.save()
        return comment

    def get_feature_vector(self, dictionary, source=None):
        vector = []
        if source is None:
            for feature_score in self.feature_scores.filter(feature__source__isnull=True).all():
                vector.append({"text": feature_score.feature.text,
                               "feature_index": feature_score.feature_index,
                               "count": feature_score.count,
                               "source": "system"})
        else:
            for feature_score in self.feature_scores.filter(feature__source=source, feature__valid=True).all():
                if feature_score.feature.origin:
                    message_id = feature_score.feature.origin.id
                    code = feature_score.feature.get_origin_message_code()
                    if code:
                        code_id = code.id

                vector.append({"text": feature_score.feature.text,
                               "feature_index": feature_score.feature_index,
                               "count": feature_score.count,
                               "source": "user",
                               "origin_message_id": message_id,
                               "origin_code_id": code_id })
        return vector

    def get_last_comment_index(self):
        comments = Comment.objects.filter(message_id=self.id).order_by('-index')
        if comments.count() > 0:
            last_comment = Comment.objects.filter(message_id=self.id).order_by('-index').first()
            return last_comment.index
        else:
            return -1

    @property
    def tokens(self):
        return map(lambda x: x.tweet_word.original_text, self.tweetword_connections.all())

    @property
    def lemmatized_tokens(self):
        # using lemmatized words
        tokens = map(lambda x: x.tweet_word.text, self.tweetword_connections.all())

        #stop_words = set(get_stoplist()+['ive', 'wasnt', 'didnt', 'dont'])
        #tokens = filter(lambda x: x not in stop_words, tokens)
        #tokens = filter(lambda x: (len(x) > 2) and not (x.startswith('http') and len(x) > 4), tokens)
        return tokens

    @property
    def filtered_tokens(self):
        # using lemmatized words
        from msgvis.apps.base.utils import get_stoplist
        tokens = map(lambda x: x.tweet_word.text, self.tweetword_connections.all())

        stop_words = set(get_stoplist()+['ive', 'wasnt', 'didnt', 'dont'])
        tokens = filter(lambda x: x not in stop_words, tokens)
        tokens = filter(lambda x: (len(x) > 2) and not (x.startswith('http') and len(x) > 4), tokens)
        return tokens