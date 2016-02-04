# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('enhance', '0008_auto_20160202_0926'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='tweetwordmessageconnection',
            options={'ordering': ['message', 'order']},
        ),
        migrations.AlterField(
            model_name='tweetwordmessageconnection',
            name='message',
            field=models.ForeignKey(related_name='tweetword_connections', to='corpus.Message'),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='tweetwordmessageconnection',
            name='tweet_word',
            field=models.ForeignKey(related_name='tweetword_connections', to='enhance.TweetWord'),
            preserve_default=True,
        ),
    ]
