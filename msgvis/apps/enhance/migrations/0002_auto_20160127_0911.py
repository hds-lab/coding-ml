# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('corpus', '0001_initial'),
        ('enhance', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='TweetWordMessageConnection',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('order', models.IntegerField()),
                ('message', models.ForeignKey(to='corpus.Message')),
                ('tweet_word', models.ForeignKey(to='enhance.TweetWord')),
            ],
            options={
                'ordering': ['order'],
            },
            bases=(models.Model,),
        ),
        migrations.RemoveField(
            model_name='tweetword',
            name='messages',
        ),
    ]
