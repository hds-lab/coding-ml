import operator
from django.db import models
from django.db.models import Q
from caching.base import CachingManager, CachingMixin

from msgvis.apps.base import models as base_models
from msgvis.apps.corpus import utils

import numpy


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

    @property
    def message_count(self):
        return self.message_set.count()

    def __unicode__(self):
        return self.name

class Code(models.Model):
    """A code of a message"""

    text = base_models.Utf8CharField(max_length=200, db_index=True)
    """The text of the code"""


class Message(models.Model):
    """
    The Message is the central data entity for the dataset.
    """
    class Meta:
        index_together = (
            ('dataset', 'ref_id'),  # used by importer
        )
            
    dataset = models.ForeignKey(Dataset)
    """Which :class:`Dataset` the message belongs to"""

    ref_id = models.BigIntegerField(null=True, blank=True, default=None)
    """A reference id for the message"""

    text = base_models.Utf8TextField(null=True, blank=True, default="")
    """The actual text of the message."""

    code = models.ForeignKey(Code, null=True, blank=True, default=None)

    def __repr__(self):
        return self.text

    def __unicode__(self):
        return self.__repr__()

    def get_feature_vector(self, dictionary):
        features = self.feature_scores.filter(dictionary=dictionary).all()
        vector = numpy.zeros(dictionary.features.count())
        for feature in features:
            vector[feature.feature_index] = feature.count
        return vector.tolist()


