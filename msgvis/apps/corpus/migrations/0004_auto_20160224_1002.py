# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import caching.base
import msgvis.apps.base.models


class Migration(migrations.Migration):

    dependencies = [
        ('corpus', '0003_auto_20160219_0743'),
    ]

    operations = [
        migrations.CreateModel(
            name='Hashtag',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('text', msgvis.apps.base.models.Utf8CharField(max_length=100, db_index=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Language',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('code', models.SlugField(unique=True, max_length=10)),
                ('name', models.CharField(max_length=100)),
            ],
            options={
            },
            bases=(caching.base.CachingMixin, models.Model),
        ),
        migrations.CreateModel(
            name='Media',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('type', models.CharField(max_length=50)),
                ('media_url', models.CharField(max_length=250)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='MessageType',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(unique=True, max_length=100)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Person',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('original_id', models.BigIntegerField(default=None, null=True, blank=True)),
                ('username', msgvis.apps.base.models.Utf8CharField(default=None, max_length=150, null=True, blank=True)),
                ('full_name', msgvis.apps.base.models.Utf8CharField(default=None, max_length=250, null=True, blank=True)),
                ('message_count', models.PositiveIntegerField(default=0, blank=True)),
                ('replied_to_count', models.PositiveIntegerField(default=0, blank=True)),
                ('shared_count', models.PositiveIntegerField(default=0, blank=True)),
                ('mentioned_count', models.PositiveIntegerField(default=0, blank=True)),
                ('friend_count', models.PositiveIntegerField(default=0, blank=True)),
                ('follower_count', models.PositiveIntegerField(default=0, blank=True)),
                ('profile_image_url', models.TextField(default=b'', null=True, blank=True)),
                ('dataset', models.ForeignKey(to='corpus.Dataset')),
                ('language', models.ForeignKey(default=None, blank=True, to='corpus.Language', null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Timezone',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('olson_code', models.CharField(default=None, max_length=40, null=True, blank=True)),
                ('name', models.CharField(max_length=150, db_index=True)),
            ],
            options={
            },
            bases=(caching.base.CachingMixin, models.Model),
        ),
        migrations.CreateModel(
            name='Url',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('domain', models.CharField(max_length=100, db_index=True)),
                ('short_url', models.CharField(max_length=250, blank=True)),
                ('full_url', models.TextField()),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AlterIndexTogether(
            name='person',
            index_together=set([('dataset', 'original_id')]),
        ),
        migrations.AddField(
            model_name='dataset',
            name='has_prefetched_images',
            field=models.BooleanField(default=False),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='contains_hashtag',
            field=models.BooleanField(default=False),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='contains_media',
            field=models.BooleanField(default=False),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='contains_mention',
            field=models.BooleanField(default=False),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='contains_url',
            field=models.BooleanField(default=False),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='hashtags',
            field=models.ManyToManyField(default=None, to='corpus.Hashtag', null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='language',
            field=models.ForeignKey(default=None, blank=True, to='corpus.Language', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='media',
            field=models.ManyToManyField(default=None, to='corpus.Media', null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='mentions',
            field=models.ManyToManyField(default=None, related_name='mentioned_in', null=True, to='corpus.Person', blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='original_id',
            field=models.BigIntegerField(default=None, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='replied_to_count',
            field=models.PositiveIntegerField(default=0, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='sender',
            field=models.ForeignKey(default=None, blank=True, to='corpus.Person', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='shared_count',
            field=models.PositiveIntegerField(default=0, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='time',
            field=models.DateTimeField(default=None, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='timezone',
            field=models.ForeignKey(default=None, blank=True, to='corpus.Timezone', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='type',
            field=models.ForeignKey(default=None, blank=True, to='corpus.MessageType', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='message',
            name='urls',
            field=models.ManyToManyField(default=None, to='corpus.Url', null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AlterIndexTogether(
            name='message',
            index_together=set([('dataset', 'original_id'), ('dataset', 'time')]),
        ),
        migrations.RemoveField(
            model_name='message',
            name='ref_id',
        ),
        migrations.RemoveField(
            model_name='message',
            name='has_golden_code',
        ),
        migrations.RemoveField(
            model_name='message',
            name='code',
        ),
    ]
