# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import msgvis.apps.base.models


class Migration(migrations.Migration):

    dependencies = [
        ('corpus', '0001_initial'),
        ('enhance', '0004_merge'),
    ]

    operations = [
        migrations.CreateModel(
            name='Feature',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('index', models.IntegerField()),
                ('text', msgvis.apps.base.models.Utf8CharField(max_length=150)),
                ('document_frequency', models.IntegerField()),
                ('dictionary', models.ForeignKey(related_name='features', to='enhance.Dictionary')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='MessageFeature',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('feature_index', models.IntegerField()),
                ('count', models.FloatField()),
                ('tfidf', models.FloatField()),
                ('dictionary', models.ForeignKey(to='enhance.Dictionary', db_index=False)),
                ('feature', models.ForeignKey(related_name='message_scores', to='enhance.Feature')),
                ('message', models.ForeignKey(related_name='feature_scores', to='corpus.Message', db_index=False)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AlterIndexTogether(
            name='messagefeature',
            index_together=set([('message', 'feature')]),
        ),
        migrations.AddField(
            model_name='feature',
            name='messages',
            field=models.ManyToManyField(related_name='features', through='enhance.MessageFeature', to='corpus.Message'),
            preserve_default=True,
        ),
    ]
