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
import msgvis.apps.coding.models as coding_models
import msgvis.apps.experiment.models as experiment_models
from django.contrib.auth.models import User


class PersonSerializer(serializers.ModelSerializer):
    profile_image_processed_url = serializers.CharField()
    class Meta:
        model = corpus_models.Person
        fields = ('id', 'dataset', 'original_id', 'username', 'full_name', 'profile_image_processed_url', )


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

    sender = PersonSerializer()
    embedded_html = serializers.CharField()
    media_url = serializers.CharField()
    tokens = serializers.ListField()
    lemmatized_tokens = serializers.ListField()

    class Meta:
        model = corpus_models.Message
        fields = ('id', 'dataset', 'text', 'sender', 'time', 'original_id', 'embedded_html',
                  'media_url', 'tokens', 'lemmatized_tokens')


class CodeSerializer(serializers.ModelSerializer):

    class Meta:
        model = corpus_models.Code
        fields = ('id', 'text', )

class UserSerializer(serializers.ModelSerializer):

    def to_representation(self, instance):
        return instance.username
    class Meta:
        model = User
        fields = ('username', )


class FeatureVectorSerializer(serializers.Serializer):
    message = MessageSerializer()
    feature_vector = serializers.ListField(child=serializers.DictField())

class FeatureCodeDistributionSerializer(serializers.Serializer):
    feature_id = serializers.IntegerField()
    feature_index = serializers.IntegerField()
    feature_text = serializers.CharField()
    source = serializers.CharField()
    distribution = serializers.DictField()
    normalized_distribution = serializers.DictField()
    total_count = serializers.IntegerField()
    entropy = serializers.FloatField()
    origin_message_id = serializers.IntegerField(required=False)
    origin_code_id = serializers.IntegerField(required=False)



class SVMResultSerializer(serializers.Serializer):
    results = serializers.DictField()
    messages = serializers.ListField(child=FeatureVectorSerializer(), required=True)


class FeatureSerializer(serializers.ModelSerializer):
    token_list = serializers.ListField(child=serializers.CharField(), required=False)
    class Meta:
        model = enhance_models.Feature
        fields = ('id', 'dictionary', 'index', 'text', 'document_frequency', 'token_list', 'source', 'origin', )
        read_only_fields = ('id', 'dictionary', 'index', 'text', 'document_frequency', 'source', )


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
        fields = ('id', 'name', 'time', 'feature_count', 'dataset', )
        read_only_fields = ('id', 'name', 'time', 'feature_count', 'dataset', )


class IndicatorSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        return instance.type
    class Meta:
        model = coding_models.DisagreementIndicator

class CodeAssignmentSerializer(serializers.ModelSerializer):
    user_code = CodeSerializer(source="code", required=False)
    partner_code = CodeSerializer(required=False)
    disagreement_indicator = IndicatorSerializer(required=False)

    message = MessageSerializer(required=False)
    class Meta:
        model = coding_models.CodeAssignment
        fields = ('id', 'source', 'message', 'is_example', 'is_ambiguous',
                  'is_saved', 'code', 'user_code', 'partner_code', 'disagreement_indicator', )
        read_only_fields = ('id', 'source', 'message', 'user_code', 'partner_code', 'disagreement_indicator', )


#class CodeDefinitionSerializer(serializers.ModelSerializer):
#    source = UserSerializer(required=False)
#    examples = MessageSerializer(required=False)
#    class Meta:
#        model = coding_models.CodeDefinition
#        fields = ('code', 'source', 'text', 'examples', )
#        read_only_fields = ('code', 'source', 'examples', )


class CodeDefinitionSerializer(serializers.Serializer):
    code_id = serializers.IntegerField(required=False)
    code_text = serializers.CharField(required=False)
    source = UserSerializer(required=False)
    text = serializers.CharField(allow_blank=True)
    examples = MessageSerializer(many=True, required=False)


class CodeDefinitionSetSerializer(serializers.Serializer):
    source = serializers.CharField(required=False)
    definitions = CodeDefinitionSerializer(many=True, required=False)

class CodeMessageSerializer(serializers.Serializer):
    code_id = serializers.IntegerField(required=False)
    code_text = serializers.CharField(required=False)
    source = UserSerializer()
    assignments = CodeAssignmentSerializer(many=True, required=False)


class DisagreementIndicatorSerializer(serializers.ModelSerializer):
    user_assignment = CodeAssignmentSerializer(required=False)
    partner_assignment = CodeAssignmentSerializer(required=False)
    class Meta:
        model = coding_models.DisagreementIndicator
        fields = ('id', 'message', 'user_assignment', 'partner_assignment', 'type', )
        read_only_fields = ('id', 'message', 'user_assignment', 'partner_assignment', )




class PairwiseSerializer(serializers.Serializer):
    user_code = serializers.CharField()
    partner_code = serializers.CharField()
    count = serializers.IntegerField()

class ProgressSerializer(serializers.ModelSerializer):
    user = UserSerializer(required=False)
    class Meta:
        model = experiment_models.Progress
        fields = ('user', 'current_message_id', 'current_stage_index', 'current_status', )
        read_only_fields = ('user', 'current_message_id', 'current_stage_index', 'current_status', )