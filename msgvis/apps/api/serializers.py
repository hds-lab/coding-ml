"""
This module defines serializers for the main API data objects:

.. autosummary::
    :nosignatures:

    DimensionSerializer
    FilterSerializer
    MessageSerializer
    QuestionSerializer

"""
from django.core.paginator import Paginator

from rest_framework import serializers, pagination

import msgvis.apps.corpus.models as corpus_models
import msgvis.apps.enhance.models as enhance_models
from django.contrib.auth.models import User

# A simple string field that looks up dimensions on deserialization
class MessageSerializer(serializers.ModelSerializer):
    """
    JSON representation of :class:`.Message`
    objects for the API.

    Messages are provided in a simple format that is useful for displaying
    examples:

    ::

        {
          "id": 52,
          "dataset": 2,
          "text": "Some sort of thing or other",
          "sender": {
            "id": 2,
            "dataset": 1
            "original_id": 2568434,
            "username": "my_name",
            "full_name": "My Name"
          },
          "time": "2010-02-25T00:23:53Z"
        }

    Additional fields may be added later.
    """


    class Meta:
        model = corpus_models.Message
        fields = ('id', 'dataset', 'text', )


class WordSerializer(serializers.ModelSerializer):
    class Meta:
        model = enhance_models.Word

    def to_representation(self, instance):
        return instance.text

class SVMResultSerializer(serializers.Serializer):
    results = serializers.DictField()

class FeatureVectorSerializer(serializers.Serializer):
    message = MessageSerializer()
    feature_vector = serializers.ListField()

class PaginatedMessageSerializer(pagination.PaginationSerializer):
    class Meta:
        object_serializer_class = MessageSerializer


class DatasetSerializer(serializers.ModelSerializer):

    class Meta:
        model = corpus_models.Dataset
        fields = ('id', 'name', 'description', 'message_count', )
        read_only_fields = ('id', 'name', 'description', 'message_count', )


class DictionarySerializer(serializers.ModelSerializer):
    dataset = DatasetSerializer()
    class Meta:
        model = enhance_models.Dictionary
        fields = ('id', 'name', 'time', 'word_count', 'feature_count', 'dataset', )
        read_only_fields = ('id', 'name', 'time', 'word_count', 'feature_count', 'dataset', )
