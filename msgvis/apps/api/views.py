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
import types
from django.db import transaction

from rest_framework import status
from rest_framework.views import APIView, Response
from django.core.urlresolvers import NoReverseMatch
from rest_framework.reverse import reverse
from rest_framework.compat import get_resolver_match, OrderedDict
from django.core.context_processors import csrf
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Count
from django.contrib.auth.models import User

from msgvis.apps.api import serializers
from msgvis.apps.corpus import models as corpus_models
from msgvis.apps.enhance import models as enhance_models
import json
import logging

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
                return Response(output.data, status=status.HTTP_200_OK)
            except:
                return Response("Dictionary not exist", status=status.HTTP_400_BAD_REQUEST)

        return Response("Please specify dictionary id", status=status.HTTP_400_BAD_REQUEST)



class SVMResultView(APIView):
    """
    Get svm result of a dictionary

    **Request:** ``GET /api/svm?id=1``
    """


    def get(self, request, format=None):
        if request.query_params.get('dictionary_id'):
            dictionary_id = int(request.query_params.get('dictionary_id'))
            try:
                dictionary = enhance_models.Dictionary.objects.get(id=dictionary_id)
                results = dictionary.do_training()
                output = serializers.SVMResultSerializer({'results': results})
                #import json
                #output = json.dumps(results)
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

    **Request:** ``GET /api/vector?dictionary_id=1&message_id=1``
    """


    def get(self, request, format=None):
        if request.query_params.get('dictionary_id') and request.query_params.get('message_id'):
            dictionary_id = int(request.query_params.get('dictionary_id'))
            message_id = int(request.query_params.get('message_id'))
            try:
                dictionary = enhance_models.Dictionary.objects.get(id=dictionary_id)
                message = corpus_models.Message.objects.get(id=message_id)
                feature_vector = message.get_feature_vector(dictionary=dictionary)
                output = serializers.FeatureVectorSerializer({'message': message, 'feature_vector': feature_vector})
                #import json
                #output = json.dumps(results)
                return Response(output.data, status=status.HTTP_200_OK)
            except:
                import traceback
                traceback.print_exc()
                import pdb
                pdb.set_trace()

                return Response("Dictionary not exist", status=status.HTTP_400_BAD_REQUEST)

        return Response("Please specify dictionary id", status=status.HTTP_400_BAD_REQUEST)


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
