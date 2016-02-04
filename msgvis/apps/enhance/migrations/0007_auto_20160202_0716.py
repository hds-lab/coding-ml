# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('enhance', '0006_feature_source'),
    ]

    operations = [

        migrations.RemoveField(
            model_name='messagetopic',
            name='message',
        ),
        migrations.RemoveField(
            model_name='messagetopic',
            name='topic',
        ),
        migrations.RemoveField(
            model_name='messagetopic',
            name='topic_model',
        ),

        migrations.RemoveField(
            model_name='messageword',
            name='dictionary',
        ),
        migrations.RemoveField(
            model_name='messageword',
            name='message',
        ),
        migrations.RemoveField(
            model_name='messageword',
            name='word',
        ),
        migrations.RemoveField(
            model_name='topic',
            name='messages',
        ),
        migrations.DeleteModel(
            name='MessageTopic',
        ),
        migrations.RemoveField(
            model_name='topic',
            name='model',
        ),
        migrations.RemoveField(
            model_name='topic',
            name='words',
        ),
        migrations.RemoveField(
            model_name='topicmodel',
            name='dictionary',
        ),
        migrations.DeleteModel(
            name='TopicModel',
        ),
        migrations.RemoveField(
            model_name='topicword',
            name='topic',
        ),
        migrations.DeleteModel(
            name='Topic',
        ),
        migrations.RemoveField(
            model_name='topicword',
            name='word',
        ),
        migrations.DeleteModel(
            name='TopicWord',
        ),
        migrations.RemoveField(
            model_name='word',
            name='dictionary',
        ),
        migrations.RemoveField(
            model_name='word',
            name='messages',
        ),
        migrations.DeleteModel(
            name='MessageWord',
        ),
        migrations.DeleteModel(
            name='Word',
        ),
    ]
