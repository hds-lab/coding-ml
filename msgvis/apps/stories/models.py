from __future__ import unicode_literals

import operator
from django.db import models
from django.db.models import Q
from caching.base import CachingManager, CachingMixin

from msgvis.apps.base import models as base_models

import numpy



class Story_Content(models.Model):
    """Represents a chapter of a story"""

    story_id = models.IntegerField(primary_key=True)
    
    chapter = models.IntegerField(primary_key=True)
    
    chapter_title = models.CharField(max_length=256)
    
    content = models.TextField()

    class Meta:
        managed = False # used by importer
        db_table = 'story_content'

    def __repr__(self):
        return self.content

    def __unicode__(self):
        return self.__repr__()

    # def get_feature_vector(self, dictionary, source=None):
    #     vector = []
    #     if source is None:
    #         for feature_score in self.feature_scores.filter(feature__source__isnull=True).all():
    #             vector.append({"text": feature_score.feature.text,
    #                            "feature_index": feature_score.feature_index,
    #                            "count": feature_score.count,
    #                            "source": "system"})
    #     else:
    #         for feature_score in self.feature_scores.filter(feature__source=source, feature__valid=True).all():
    #             if feature_score.feature.origin:
    #                 message_id = feature_score.feature.origin.id
    #                 code = feature_score.feature.get_origin_message_code()
    #                 if code:
    #                     code_id = code.id

    #             vector.append({"text": feature_score.feature.text,
    #                            "feature_index": feature_score.feature_index,
    #                            "count": feature_score.count,
    #                            "source": "user",
    #                            "origin_message_id": message_id,
    #                            "origin_code_id": code_id })
    #     return vector

    # @property
    # def tokens(self):
    #     return map(lambda x: x.tweet_word.original_text, self.tweetword_connections.all())

    # @property
    # def lemmatized_tokens(self):
    #     # using lemmatized words
    #     tokens = map(lambda x: x.tweet_word.text, self.tweetword_connections.all())

    #     #stop_words = set(get_stoplist()+['ive', 'wasnt', 'didnt', 'dont'])
    #     #tokens = filter(lambda x: x not in stop_words, tokens)
    #     #tokens = filter(lambda x: (len(x) > 2) and not (x.startswith('http') and len(x) > 4), tokens)
    #     return tokens

    # @property
    # def filtered_tokens(self):
    #     # using lemmatized words
    #     from msgvis.apps.base.utils import get_stoplist
    #     tokens = map(lambda x: x.tweet_word.text, self.tweetword_connections.all())

    #     stop_words = set(get_stoplist()+['ive', 'wasnt', 'didnt', 'dont'])
    #     tokens = filter(lambda x: x not in stop_words, tokens)
    #     tokens = filter(lambda x: (len(x) > 2) and not (x.startswith('http') and len(x) > 4), tokens)
    #     return tokens