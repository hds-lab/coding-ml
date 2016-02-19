from django.test import TestCase
from django.utils.timezone import now, timedelta
from msgvis.apps.corpus import models as corpus_models
from msgvis.apps.corpus import utils as corpus_utils
from msgvis.apps.coding import models as coding_models
from msgvis.apps.api import serializers
from django.contrib.auth.models import User

from msgvis.apps.api.tests import api_time_format


class CodeDefinitionSerializerTest(TestCase):
    """
    {
        "id": 2,
        "dataset": 1
        "original_id": 2568434,
        "username": "my_name",
        "full_name": "My Name"
        "language": "en",
        "replied_to_count": 25,
        "shared_count": null,
        "mentioned_count": 24,
        "friend_count": 62,
        "follower_count": 0
    }
    """

    def test_code_definition_serialization(self):
        master = User.objects.create_user(username='master')
        user1 = User.objects.create_user(username='user1')
        code = corpus_models.Code.objects.create(text='testcode')
        dataset = corpus_models.Dataset.objects.create(name='test', description='test')
        messages = [corpus_models.Message.objects.create(dataset=dataset, text='msg0'),
                    corpus_models.Message.objects.create(dataset=dataset, text='msg1'),
                    corpus_models.Message.objects.create(dataset=dataset, text='msg2')]

        code_definition1 = coding_models.CodeDefinition.objects.create(code=code, source=master, text='master_def')
        code_definition1.examples.add(messages[0])
        code_definition1.examples.add(messages[2])

        code_definition2 = coding_models.CodeDefinition.objects.create(code=code, source=user1, text='user1_def')
        code_definition2.examples.add(messages[1])
        code_definition2.examples.add(messages[2])

        desired_result = [
            {
                "code_id": code.id,
                "source": "master",
                "text": "master_def",
                "examples": [serializers.MessageSerializer(messages[0]).data, serializers.MessageSerializer(messages[2]).data]
            },
            {
                "code_id": code.id,
                "source": "user1",
                "text": "user1_def",
                "examples": [serializers.MessageSerializer(messages[1]).data, serializers.MessageSerializer(messages[2]).data]
            }
        ]

        code_definitions = [code.get_definition(master), code.get_definition(user1)]

        serializer = serializers.CodeDefinitionSerializer(code_definitions, many=True)
        try:
            result = serializer.data
            self.assertListEqual(result, desired_result)
        except:
            import pdb
            pdb.set_trace()

