# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('corpus', '0001_initial'),
        ('enhance', '0002_auto_20160127_0911'),
    ]

    operations = [
        migrations.AddField(
            model_name='tweetword',
            name='messages',
            field=models.ManyToManyField(related_name='tweet_words', through='enhance.TweetWordMessageConnection', to='corpus.Message'),
            preserve_default=True,
        ),
    ]
