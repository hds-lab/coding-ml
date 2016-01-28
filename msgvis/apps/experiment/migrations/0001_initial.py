# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('corpus', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Assignment',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Condition',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(default=None, max_length=250, blank=True)),
                ('description', models.TextField(default=b'', blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Experiment',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(default=None, max_length=250, blank=True)),
                ('description', models.TextField(default=b'', blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('dataset', models.ForeignKey(related_name='groups', to='corpus.Dataset')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='MessageSelection',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('order', models.IntegerField()),
                ('message', models.ForeignKey(to='corpus.Message')),
            ],
            options={
                'ordering': ['order'],
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Pair',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('user1', models.OneToOneField(related_name='pairA', to=settings.AUTH_USER_MODEL)),
                ('user2', models.OneToOneField(related_name='pairB', to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='Stage',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('order', models.IntegerField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('experiment', models.ForeignKey(related_name='stages', to='experiment.Experiment')),
                ('messages', models.ManyToManyField(related_name='stages', through='experiment.MessageSelection', to='corpus.Message')),
            ],
            options={
                'ordering': ['order'],
            },
            bases=(models.Model,),
        ),
        migrations.AddField(
            model_name='messageselection',
            name='stage',
            field=models.ForeignKey(to='experiment.Stage'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='condition',
            name='experiment',
            field=models.ForeignKey(related_name='conditions', to='experiment.Experiment'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='assignment',
            name='condition',
            field=models.ForeignKey(related_name='assignments', to='experiment.Condition'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='assignment',
            name='experiment',
            field=models.ForeignKey(related_name='assignments', to='experiment.Experiment'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='assignment',
            name='pair',
            field=models.OneToOneField(related_name='assignment', to='experiment.Pair'),
            preserve_default=True,
        ),
    ]
