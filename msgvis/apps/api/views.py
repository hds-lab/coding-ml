"""
The view classes below define the API endpoints.

+-----------------------------------------------------------------+-----------------+-------------------------------------------------+
| Endpoint                                                        | Url             | Purpose                                         |
+=================================================================+=================+=================================================+
| :class:`Get Data Table <DataTableView>`                         | /api/table      | Get table of counts based on dimensions/filters |
+-----------------------------------------------------------------+-----------------+-------------------------------------------------+
| :class:`Get Example Messages <ExampleMessagesView>`             | /api/messages   | Get example messages for slice of data          |
+-----------------------------------------------------------------+-----------------+-------------------------------------------------+
| :class:`Get Research Questions <ResearchQuestionsView>`         | /api/questions  | Get RQs related to dimensions/filters           |
+-----------------------------------------------------------------+-----------------+-------------------------------------------------+
| Message Context                                                 | /api/context    | Get context for a message                       |
+-----------------------------------------------------------------+-----------------+-------------------------------------------------+
| Snapshots                                                       | /api/snapshots  | Save a visualization snapshot                   |
+-----------------------------------------------------------------+-----------------+-------------------------------------------------+
"""

from django.db import IntegrityError

from rest_framework import status
from rest_framework.views import APIView, Response
from django.core.urlresolvers import NoReverseMatch
from rest_framework.reverse import reverse
from rest_framework.compat import get_resolver_match, OrderedDict
from django.core.context_processors import csrf
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count
from django.contrib.auth.models import User
from operator import attrgetter, itemgetter

from msgvis.apps.api import serializers
from msgvis.apps.corpus import models as corpus_models
from msgvis.apps.enhance import models as enhance_models
from msgvis.apps.experiment import models as experiment_models
from msgvis.apps.coding import models as coding_models
import json
import logging

from msgvis.apps.base.utils import AttributeDict, entropy

logger = logging.getLogger(__name__)


class DatasetView(APIView):
    """
    Get details of a dataset

    **Request:** ``GET /api/dataset/1``
    """


    def get(self, request, format=None):
        if request.query_params.get('id'):
            dataset_id = int(request.query_params.get('id'))
            try:
                dataset = corpus_models.Dataset.objects.get(id=dataset_id)
                output = serializers.DatasetSerializer(dataset)
                return Response(output.data, status=status.HTTP_200_OK)
            except:
                return Response("Dataset not exist", status=status.HTTP_400_BAD_REQUEST)

        return Response("Please specify dataset id", status=status.HTTP_400_BAD_REQUEST)


class MessageView(APIView):
    """
    Get details of a message

    **Request:** ``GET /api/message/1``
    """

    def get(self, request, message_id, format=None):

        message_id = int(message_id)
        try:
            message = corpus_models.Message.objects.get(id=message_id)
            output = serializers.MessageSerializer(message)
            return Response(output.data, status=status.HTTP_200_OK)
        except:
            return Response("Message not exist", status=status.HTTP_400_BAD_REQUEST)


class DictionaryView(APIView):
    """
    Get details of a dataset

    **Request:** ``GET /api/dictionary?id=1``
    """


    def get(self, request, format=None):
        if request.query_params.get('id'):
            dictionary_id = int(request.query_params.get('id'))
            try:
                dictionary = enhance_models.Dictionary.objects.get(id=dictionary_id)
                output = serializers.DictionarySerializer(dictionary)
                final_output = dict(output.data)
                if self.request.user is not None:
                    user = self.request.user
                    participant = None
                    if user.id is not None and User.objects.filter(id=self.request.user.id).count() != 0:
                        participant = User.objects.get(id=self.request.user.id)
                    user_feature_count = dictionary.get_user_feature_count(source=participant)
                    final_output['feature_count'] += user_feature_count

                return Response(final_output, status=status.HTTP_200_OK)
            except:
                return Response("Dictionary not exist", status=status.HTTP_400_BAD_REQUEST)

        return Response("Please specify dictionary id", status=status.HTTP_400_BAD_REQUEST)



class SVMResultView(APIView):
    """
    Get svm result of a dictionary

    **Request:** ``GET /api/svm?dictionary_id=1``
    """


    def get(self, request, format=None):
        if request.query_params.get('dictionary_id'):
            dictionary_id = int(request.query_params.get('dictionary_id'))
            participant = None
            if self.request.user is not None:
                user = self.request.user
                if user.id is not None and User.objects.filter(id=self.request.user.id).count() != 0:
                    participant = User.objects.get(id=self.request.user.id)
            try:
                dictionary = enhance_models.Dictionary.objects.get(id=dictionary_id)
                results = dictionary.do_training()
                all_messages = corpus_models.Message.objects.all()
                messages = []

                for message in all_messages:

                    feature_vector = message.get_feature_vector(dictionary=dictionary)
                    output = {'message': message, 'feature_vector': feature_vector}
                    messages.append(output)

                output = serializers.SVMResultSerializer({'results': results, 'messages': messages})

                return Response(output.data, status=status.HTTP_200_OK)
            except:
                import traceback
                traceback.print_exc()
                import pdb
                pdb.set_trace()

                return Response("Dictionary not exist", status=status.HTTP_400_BAD_REQUEST)

        return Response("Please specify dictionary id", status=status.HTTP_400_BAD_REQUEST)

class FeatureVectorView(APIView):
    """
    Get svm result of a dictionary

    **Request:** ``GET /api/vector/(?P<message_id>[0-9]+)?feature_source=system+user+partner``
    """


    def get(self, request, message_id, format=None):

        if self.request.user is None or self.request.user.id is None or (not User.objects.filter(id=self.request.user.id).exists()):
            return Response("Please login first", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(id=self.request.user.id)
        partner = user.pair.first().get_partner(user) if user.pair.exists() else None
        dictionary = user.pair.first().assignment.experiment.dictionary
        message_id = int(message_id)
        feature_sources = request.query_params.get('feature_source', "user").split(" ")

        try:

            message = corpus_models.Message.objects.get(id=message_id)
            final_vector = []
            for feature_source in feature_sources:
                if feature_source == "system":
                    final_vector += message.get_feature_vector(dictionary=dictionary, source=None)
                elif feature_source == "user":
                    final_vector += message.get_feature_vector(dictionary=dictionary, source=user)
                elif feature_source == "partner":
                    final_vector += message.get_feature_vector(dictionary=dictionary, source=partner)
            tweet_words = map(lambda x: x.tweet_word.original_text, message.tweetword_connections.all()) # get the token list and extract only original text
            # TODO: make sure to better communicate the fact we lemmatize words
            output = serializers.FeatureVectorSerializer({'message': message, 'tokens': tweet_words, 'feature_vector': final_vector})

            return Response(output.data, status=status.HTTP_200_OK)
        except:
            import traceback
            traceback.print_exc()
            import pdb
            pdb.set_trace()

            return Response("Dictionary not exist", status=status.HTTP_400_BAD_REQUEST)


class UserFeatureView(APIView):
    """
    Get or set user features

    **Request:** ``GET /api/feature``
    """


    def get(self, request, format=None):

        if self.request.user is None or self.request.user.id is None or (not User.objects.filter(id=self.request.user.id).exists()):
            return Response("Please login first", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(id=self.request.user.id)

        features = user.features.filter(valid=True).all()

        output = serializers.FeatureSerializer(features, many=True)

        return Response(output.data, status=status.HTTP_200_OK)


    def post(self, request, format=None):

        if self.request.user is None or self.request.user.id is None or (not User.objects.filter(id=self.request.user.id).exists()):
            return Response("Please login first", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(id=self.request.user.id)
        dictionary = user.pair.first().assignment.experiment.dictionary

        input = serializers.FeatureSerializer(data=request.data)
        if input.is_valid():
            data = input.validated_data

            token_list = data["token_list"]
            feature = dictionary.add_feature(token_list, source=user)

            item = {
                "feature_id": feature.id,
                "feature_index": feature.index,
                "feature_text": feature.text,
                "source": "user",
                "distribution": {},
                "normalized_distribution": {},
                "total_count": 0,
                "entropy": None
            }
            item = AttributeDict(item)
            for code in corpus_models.Code.objects.all():
                item["distribution"][code.text] = 0

            counts = enhance_models.Feature.objects\
                .filter(id=feature.id, messages__code_assignments__isnull=False, messages__code_assignments__valid=True)\
                .values('index', 'text', 'messages__code_assignments__code__id', 'messages__code_assignments__code__text')\
                                    .annotate(count=Count('messages')).order_by('id', 'count').all()
            for count in counts:
                count = AttributeDict(count)
                item["distribution"][count.messages__code_assignments__code__text] = count.count


            item["total_count"] = 0
            for code in item.distribution:
                item["total_count"] += item.distribution[code]
            for code in item.distribution:
                if item["total_count"] > 0:
                    item.normalized_distribution[code] = float(item.distribution[code]) / float(item["total_count"])
                else:
                    item.normalized_distribution[code] = 0
            item["entropy"] = entropy(item.distribution)


            output = serializers.FeatureCodeDistributionSerializer(item)

            return Response(output.data, status=status.HTTP_200_OK)

        return Response(input.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, feature_id, format=None):
        if self.request.user is None or self.request.user.id is None or (not User.objects.filter(id=self.request.user.id).exists()):
            return Response("Please login first", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(id=self.request.user.id)

        feature = enhance_models.Feature.objects.get(id=feature_id, source=user)
        feature.valid = False
        feature.save()
        return Response(status=status.HTTP_200_OK)


class FeatureCodeDistributionView(APIView):
    """
    Get the distribution of features across codes

    **Request:** ``GET /distribution?feature_source=system+user+partner``
    """

    def get(self, request, format=None):

        if self.request.user is None or self.request.user.id is None or (not User.objects.filter(id=self.request.user.id).exists()):
            return Response("Please login first", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(id=self.request.user.id)
        partner = user.pair.first().get_partner(user)
        dictionary = user.pair.first().assignment.experiment.dictionary
        feature_sources = request.query_params.get('feature_source', "system user partner").split(" ")
        feature_num = int(request.query_params.get('feature_num', 30))


        source_map = {
            "system": "system",
            "user": user,
            "partner": partner,
            partner: "partner",
            user: "user",
            "system": "system"
        }
        source_list = []
        for feature_source in feature_sources:
                source_list.append(source_map[feature_source])

        features = dictionary.get_feature_list(source_list)

        distributions = []
        distribution_map = {}
        try:

            for feature in features:
                source = feature.source if hasattr(feature, 'source') else "system"
                item = {
                    "feature_id": feature.id,
                    "feature_index": feature.index,
                    "feature_text": feature.text,
                    "source": source_map[source],
                    "distribution": {},
                    "normalized_distribution": {},
                    "total_count": 0,
                    "entropy": None
                }
                item = AttributeDict(item)
                for code in corpus_models.Code.objects.all():
                    item["distribution"][code.text] = 0
                distributions.append(item)
                distribution_map[feature.index] = item

            counts = features.filter(messages__code_assignments__isnull=False, messages__code_assignments__valid=True)\
                .values('index', 'text', 'messages__code_assignments__code__id', 'messages__code_assignments__code__text')\
                .annotate(count=Count('messages')).order_by('id', 'count').all()
            for count in counts:
                count = AttributeDict(count)
                distribution_map[count.index]["distribution"][count.messages__code_assignments__code__text] = count.count

            for item in distributions:
                item["total_count"] = 0
                for code in item.distribution:
                    item["total_count"] += item.distribution[code]

                for code in item.distribution:
                    if item["total_count"] > 0:
                        item.normalized_distribution[code] = float(item.distribution[code]) / float(item["total_count"])
                    else:
                        item.normalized_distribution[code] = 0

                item["entropy"] = entropy(item.distribution)



            # first sort by total count
            distributions.sort(key=attrgetter("total_count"), reverse=True)
            # Then sort by entropy. The order will be equivalent to (entropy, -total_count)
            distributions.sort(key=attrgetter("entropy"))

            distributions = distributions[:feature_num]

            output = serializers.FeatureCodeDistributionSerializer(distributions, many=True)

            return Response(output.data, status=status.HTTP_200_OK)
        except:
            import traceback
            traceback.print_exc()
            import pdb
            pdb.set_trace()

            return Response(status=status.HTTP_400_BAD_REQUEST)



class CodeDefinitionView(APIView):
    """
    Get the definition of a code

    **Request:** ``GET /definition?source=master+user+partner``
    """

    def get(self, request, format=None):

        if self.request.user is None or self.request.user.id is None or (not User.objects.filter(id=self.request.user.id).exists()):
            return Response("Please login first", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(id=self.request.user.id)
        partner = user.pair.first().get_partner(user) if user.pair.exists() else None

        sources = request.query_params.get('source', "user").split(" ")

        try:
            code_def_set = []
            for source in sources:
                code_definitions = []
                if source == "user":
                    source_user = user
                elif source == "partner":
                    source_user = partner
                else:
                    source_user = User.objects.get(username=source)
                for code in corpus_models.Code.objects.all():
                    code_definition = code.get_definition(source_user)
                    if code_definition:
                        code_definitions.append(code_definition)
                code_def_set.append({"source": source_user, "definitions":code_definitions})

            output = serializers.CodeDefinitionSetSerializer(code_def_set, many=True)

            return Response(output.data, status=status.HTTP_200_OK)
        except:
            import traceback
            traceback.print_exc()
            import pdb
            pdb.set_trace()

            return Response("Code definition not exist", status=status.HTTP_400_BAD_REQUEST)

    def post(self, request, code_id, format=None):

        if self.request.user is None or self.request.user.id is None or (not User.objects.filter(id=self.request.user.id).exists()):
            return Response("Please login first", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(id=self.request.user.id)

        code_id = int(code_id)
        code = corpus_models.Code.objects.get(id=code_id)

        input = serializers.CodeDefinitionSerializer(data=request.data)
        if input.is_valid():
            data = input.validated_data
            text = data['text']

            definition, created = coding_models.CodeDefinition.objects.get_or_create(code=code, source=user, valid=True)
            if not created:
                definition.valid = False
                definition.save()
                definition = coding_models.CodeDefinition(code=code, source=user)

            definition.text = text
            definition.save()

            output = serializers.CodeDefinitionSerializer(definition)
            return Response(output.data, status=status.HTTP_200_OK)

        return Response(input.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, code_id, format=None):

        if self.request.user is None or self.request.user.id is None or (not User.objects.filter(id=self.request.user.id).exists()):
            return Response("Please login first", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(id=self.request.user.id)

        code_id = int(code_id)
        code = corpus_models.Code.objects.get(id=code_id)

        input = serializers.CodeDefinitionSerializer(data=request.data)
        if input.is_valid():
            data = input.validated_data
            text = data['text']

            definition = coding_models.CodeDefinition.objects.get(code=code, source=user, valid=True)
            definition.valid = False
            definition.save()

            definition = coding_models.CodeDefinition(code=code, source=user, text=text)
            definition.save()

            output = serializers.CodeDefinitionSerializer(definition)
            return Response(output.data, status=status.HTTP_200_OK)

        return Response(input.errors, status=status.HTTP_400_BAD_REQUEST)

class CodeAssignmentView(APIView):
    """
    Assign a code to a message

    **Request:** ``POST /assignment/``
    """

    def post(self, request, message_id, format=None):

        input = serializers.CodeAssignmentSerializer(data=request.data)
        if input.is_valid():
            data = input.validated_data
            message = corpus_models.Message.objects.get(id=message_id)
            code = data['code']

            if self.request.user is not None:
                user_dict = self.request.user
                if user_dict.id is not None and User.objects.filter(id=user_dict.id).exists():
                    user = User.objects.get(id=self.request.user.id)
                    assignments = coding_models.CodeAssignment.objects.filter(is_user_labeled=True, source=user,
                                                                              message=message, valid=True)
                    if assignments.exists():
                        assignments.update(valid=False)

                    code_assignment = coding_models.CodeAssignment(
                                                                    is_user_labeled=True, source=user,
                                                                    message=message, code=code, valid=True)

                    code_assignment.is_example=data['is_example']
                    code_assignment.is_saved=data['is_saved']
                    code_assignment.is_ambiguous=data['is_ambiguous']
                    code_assignment.save()

                    output = serializers.CodeAssignmentSerializer(code_assignment)
                    return Response(output.data, status=status.HTTP_200_OK)

        return Response(input.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, message_id, format=None):

        return self.post(request, message_id, format)


class CodeMessageView(APIView):
    """
    Get the messages of a code

    **Request:** ``GET /code_messages/?code_id=1&source=master&stage=current``
    (Whatever value is given to stage will make this query only get current stage.)
    """

    def get(self, request, format=None):

        if self.request.user is None or self.request.user.id is None or (not User.objects.filter(id=self.request.user.id).exists()):
            return Response("Please login first", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(id=self.request.user.id)
        partner = user.pair.first().get_partner(user) if user.pair.exists() else None

        try:
            code_id = int(request.query_params.get('code'))
            code = corpus_models.Code.objects.get(id=code_id)

            stage = None
            if request.query_params.get('stage'):
                stage = user.progress.current_stage

            source = request.query_params.get('source', "user")
            if source == "user":
                source_user = user
            elif source == "partner":
                source_user = partner
            else:
                source_user = User.objects.get(username=source)


            if stage:
                assignments = coding_models.CodeAssignment.objects.filter(source=source_user,
                                                                          is_user_labeled=True,
                                                                          code=code,
                                                                          message__selection__stage=stage,
                                                                          valid=True).all()
            else:
                assignments = coding_models.CodeAssignment.objects.filter(source=source_user,
                                                                          is_user_labeled=True,
                                                                          code=code,
                                                                          valid=True).all()
            code_messages = {
                "code_id": code.id,
                "code_text": code.text,
                "source": source_user,
                "assignments": assignments,
            }

            output = serializers.CodeMessageSerializer(code_messages)

            return Response(output.data, status=status.HTTP_200_OK)
        except:
            import traceback
            traceback.print_exc()
            import pdb
            pdb.set_trace()

            return Response("Errors", status=status.HTTP_400_BAD_REQUEST)

class AllCodedMessageView(APIView):
    """
    Get the messages of a code

    **Request:** ``GET /all_coded_messages/?stage=current``
    (Whatever value is given to stage will make this query only get current stage.)
    """

    def get(self, request, format=None):

        if self.request.user is None or self.request.user.id is None or (not User.objects.filter(id=self.request.user.id).exists()):
            return Response("Please login first", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(id=self.request.user.id)
        partner = user.pair.first().get_partner(user) if user.pair.exists() else None

        try:
            stage = None
            if request.query_params.get('stage'):
                stage = user.progress.current_stage

            if stage:
                assignments = coding_models.CodeAssignment.objects.filter(source=user,
                                                                          is_user_labeled=True,
                                                                          message__selection__stage=stage,
                                                                          valid=True).all()
            else:
                assignments = coding_models.CodeAssignment.objects.filter(source=user,
                                                                          is_user_labeled=True,
                                                                          valid=True).all()

            assignments = assignments.order_by('message_id')
            output = serializers.CodeAssignmentSerializer(assignments, many=True)

            return Response(output.data, status=status.HTTP_200_OK)
        except:
            import traceback
            traceback.print_exc()
            import pdb
            pdb.set_trace()

            return Response("Errors", status=status.HTTP_400_BAD_REQUEST)

class DisagreementIndicatorView(APIView):
    """
    Get the disagreement indicator of a message

    **Request:** ``GET /disagreement/message_id``
    """

    def get(self, request, message_id, format=None):

        if self.request.user is None or self.request.user.id is None or (not User.objects.filter(id=self.request.user.id).exists()):
            return Response("Please login first", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(id=self.request.user.id)
        partner = user.pair.first().get_partner(user)

        message_id = int(message_id)
        message = corpus_models.Message.objects.get(id=message_id)
        try:
            indicator = coding_models.DisagreementIndicator.objects.filter(message=message,
                                                                        user_assignment__source=user,
                                                                        partner_assignment__source=partner,
                                                                        valid=True)
            if not indicator.exists():
                return Response("Disagreement indicator not exist", status=status.HTTP_400_BAD_REQUEST)

            output = serializers.DisagreementIndicatorSerializer(indicator.first())
            return Response(output.data, status=status.HTTP_200_OK)

        except:
            import traceback
            traceback.print_exc()
            import pdb
            pdb.set_trace()

            return Response("Disagreement indicator not exist", status=status.HTTP_400_BAD_REQUEST)

    def post(self, request, message_id, format=None):

        if self.request.user is None or self.request.user.id is None or (not User.objects.filter(id=self.request.user.id).exists()):
            return Response("Please login first", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(id=self.request.user.id)
        partner = user.pair.first().get_partner(user)

        message_id = int(message_id)
        message = corpus_models.Message.objects.get(id=message_id)

        input = serializers.DisagreementIndicatorSerializer(data=request.data)
        if input.is_valid():
            data = input.validated_data
            type = data['type']

            user_assignment = coding_models.CodeAssignment.objects.get(source=user, message=message,
                                                                       is_user_labeled=True)
            partner_assignment = coding_models.CodeAssignment.objects.get(source=partner, message=message,
                                                                          is_user_labeled=True)

            indicator = coding_models.DisagreementIndicator.objects.filter(message=message,
                                                                        user_assignment=user_assignment,
                                                                        partner_assignment=partner_assignment,
                                                                        valid=True)
            if indicator.exists():
                indicator.update(valid=False)

            indicator = coding_models.DisagreementIndicator(message=message,
                                                            user_assignment=user_assignment,
                                                            partner_assignment=partner_assignment,
                                                            type=type,
                                                            valid=True)
            indicator.save()

            output = serializers.DisagreementIndicatorSerializer(indicator)
            return Response(output.data, status=status.HTTP_200_OK)

        return Response(input.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, message_id, format=None):

        return self.post(request, message_id, format)

class PairwiseConfusionMatrixView(APIView):
    """
    Get the pairwise confusion matrix

    **Request:** ``GET /pairwise&stage=current``
    (Whatever value is given to stage will make this query only get current stage.)
    """

    def get(self, request, format=None):

        if self.request.user is None or self.request.user.id is None or (not User.objects.filter(id=self.request.user.id).exists()):
            return Response("Please login first", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(id=self.request.user.id)
        partner = user.pair.first().get_partner(user)

        stage = None
        if request.query_params.get('stage'):
            stage = user.progress.get_current_stage()

        try:
            pairwise_count = {}
            codes = corpus_models.Code.objects.all()
            for user_code in codes:
                for partner_code in codes:
                    pairwise_count[(user_code.text, partner_code.text)] = 0

            if stage:
                messages = stage.selected_messages.all()
            else:
                messages = corpus_models.Message.objects.all()

            messages = messages.filter(code_assignments__valid=True,
                                       code_assignments__source=user).all()
            messages = messages.filter(code_assignments__valid=True,
                                       code_assignments__source=partner).all()

            for msg in messages:
                user_assignment = msg.code_assignments.get(source=user, valid=True)
                partner_assignment = msg.code_assignments.get(source=partner, valid=True)
                pairwise_count[(user_assignment.code.text, partner_assignment.code.text)] += 1

            pairwise = []
            for key, value in pairwise_count.iteritems():
                pairwise.append({"user_code": key[0],
                                 "partner_code": key[1],
                                 "count": value
                                 })

            pairwise.sort(key=itemgetter("count", "user_code"), reverse=True)

            output = serializers.PairwiseSerializer(pairwise, many=True)
            return Response(output.data, status=status.HTTP_200_OK)

        except:
            import traceback
            traceback.print_exc()
            import pdb
            pdb.set_trace()

            return Response(status=status.HTTP_400_BAD_REQUEST)


class ProgressView(APIView):
    """
    Get the progress of the current user

    **Request:** ``GET /progress
    """

    def get(self, request, format=None):

        if self.request.user is None or self.request.user.id is None or (not User.objects.filter(id=self.request.user.id).exists()):
            return Response("Please login first", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(id=self.request.user.id)
        progress = user.progress

        try:

            while progress.current_status == 'N':
                try:
                    progress.set_to_next_step()
                except IntegrityError:
                    import time
                    time.sleep(1)

            output = serializers.ProgressSerializer(progress)

            return Response(output.data, status=status.HTTP_200_OK)
        except:
            import traceback
            traceback.print_exc()
            import pdb
            pdb.set_trace()

    def post(self, request, format=None):

        if self.request.user is None or self.request.user.id is None or (not User.objects.filter(id=self.request.user.id).exists()):
            return Response("Please login first", status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.get(id=self.request.user.id)
        progress = user.progress

        try:
            success = False
            while True:
                try:
                    success = progress.set_to_next_step()
                    break
                except IntegrityError:
                        import time
                        time.sleep(1)
            if success:
                progress = user.progress
                output = serializers.ProgressSerializer(progress)
                return Response(output.data, status=status.HTTP_200_OK)
            else:
                return Response("No progress can be made.", status=status.HTTP_400_BAD_REQUEST)
        except:
            import traceback
            traceback.print_exc()
            import pdb
            pdb.set_trace()


class APIRoot(APIView):
    """
    The Text Visualization DRG Root API View.
    """
    root_urls = {}

    def get(self, request, *args, **kwargs):
        ret = OrderedDict()
        namespace = get_resolver_match(request).namespace
        for key, urlconf in self.root_urls.iteritems():
            url_name = urlconf.name
            if namespace:
                url_name = namespace + ':' + url_name
            try:
                ret[key] = reverse(
                    url_name,
                    request=request,
                    format=kwargs.get('format', None)
                )
                print ret[key]
            except NoReverseMatch:
                # Don't bail out if eg. no list routes exist, only detail routes.
                continue

        return Response(ret)