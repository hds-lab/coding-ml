# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import msgvis.apps.enhance.fields
import msgvis.apps.base.models


class Migration(migrations.Migration):

    dependencies = [
        ('corpus', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Dictionary',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(max_length=100)),
                ('settings', models.TextField()),
                ('time', models.DateTimeField(auto_now_add=True)),
                ('num_docs', msgvis.apps.enhance.fields.PositiveBigIntegerField(default=0)),
                ('num_pos', msgvis.apps.enhance.fields.PositiveBigIntegerField(default=0)),
                ('num_nnz', msgvis.apps.enhance.fields.PositiveBigIntegerField(default=0)),
                ('dataset', models.ForeignKey(related_name='dictionary', default=None, blank=True, to='corpus.Dataset', null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='MessageTopic',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('probability', models.FloatField()),
                ('message', models.ForeignKey(related_name='topic_probabilities', to='corpus.Message', db_index=False)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='MessageWord',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('word_index', models.IntegerField()),
                ('count', models.FloatField()),
                ('tfidf', models.FloatField()),
                ('dictionary', models.ForeignKey(to='enhance.Dictionary', db_index=False)),
                ('message', models.ForeignKey(related_name='word_scores', to='corpus.Message', db_index=False)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='PrecalcCategoricalDistribution',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('dimension_key', models.CharField(default=b'', max_length=64, db_index=True, blank=True)),
                ('level', msgvis.apps.base.models.Utf8CharField(default=b'', max_length=128, db_index=True, blank=True)),
                ('count', models.IntegerField()),
                ('dataset', models.ForeignKey(related_name='distributions', default=None, blank=True, to='corpus.Dataset', null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Topic',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', msgvis.apps.base.models.Utf8CharField(max_length=100)),
                ('description', msgvis.apps.base.models.Utf8CharField(max_length=200)),
                ('index', models.IntegerField()),
                ('alpha', models.FloatField()),
                ('messages', models.ManyToManyField(related_name='topics', through='enhance.MessageTopic', to='corpus.Message')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='TopicModel',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(max_length=100)),
                ('description', models.CharField(max_length=200)),
                ('time', models.DateTimeField(auto_now_add=True)),
                ('perplexity', models.FloatField(default=0)),
                ('dictionary', models.ForeignKey(to='enhance.Dictionary')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='TopicWord',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('word_index', models.IntegerField()),
                ('probability', models.FloatField()),
                ('topic', models.ForeignKey(related_name='word_scores', to='enhance.Topic')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='TweetWord',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('original_text', msgvis.apps.base.models.Utf8CharField(default=b'', max_length=100, db_index=True, blank=True)),
                ('pos', models.CharField(default=b'', max_length=4, null=True, blank=True)),
                ('text', msgvis.apps.base.models.Utf8CharField(default=b'', max_length=100, db_index=True, blank=True)),
                ('dataset', models.ForeignKey(related_name='tweet_words', default=None, blank=True, to='corpus.Dataset', null=True)),
                ('messages', models.ManyToManyField(related_name='tweet_words', to='corpus.Message')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Word',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('index', models.IntegerField()),
                ('text', msgvis.apps.base.models.Utf8CharField(max_length=100)),
                ('document_frequency', models.IntegerField()),
                ('dictionary', models.ForeignKey(related_name='words', to='enhance.Dictionary')),
                ('messages', models.ManyToManyField(related_name='words', through='enhance.MessageWord', to='corpus.Message')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='topicword',
            name='word',
            field=models.ForeignKey(related_name='topic_scores', to='enhance.Word'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='topic',
            name='model',
            field=models.ForeignKey(related_name='topics', to='enhance.TopicModel'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='topic',
            name='words',
            field=models.ManyToManyField(related_name='topics', through='enhance.TopicWord', to='enhance.Word'),
            preserve_default=True,
        ),
        migrations.AlterIndexTogether(
            name='precalccategoricaldistribution',
            index_together=set([('dimension_key', 'level')]),
        ),
        migrations.AddField(
            model_name='messageword',
            name='word',
            field=models.ForeignKey(related_name='message_scores', to='enhance.Word'),
            preserve_default=True,
        ),
        migrations.AlterIndexTogether(
            name='messageword',
            index_together=set([('dictionary', 'message'), ('message', 'word')]),
        ),
        migrations.AddField(
            model_name='messagetopic',
            name='topic',
            field=models.ForeignKey(related_name='message_probabilities', to='enhance.Topic'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='messagetopic',
            name='topic_model',
            field=models.ForeignKey(to='enhance.TopicModel', db_index=False),
            preserve_default=True,
        ),
        migrations.AlterIndexTogether(
            name='messagetopic',
            index_together=set([('topic_model', 'message'), ('message', 'topic')]),
        ),
    ]
