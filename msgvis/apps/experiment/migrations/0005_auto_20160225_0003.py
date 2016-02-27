# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('corpus', '0004_auto_20160224_1002'),
        ('enhance', '0002_auto_20160222_0230'),
        ('experiment', '0004_auto_20160222_0804'),
    ]

    operations = [
        migrations.CreateModel(
            name='StageAssignment',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('order', models.IntegerField()),
                ('assignment', models.ForeignKey(related_name='stage_assignments', to='experiment.Assignment')),
                ('new_features', models.ManyToManyField(related_name='source_stages', to='enhance.Feature')),
                ('stage', models.ForeignKey(related_name='stage_assignments', to='experiment.Stage')),
            ],
            options={
                'ordering': ['order'],
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='SVMModel',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_updated', models.DateTimeField(auto_now=True, auto_now_add=True)),
                ('saved_path', models.FilePathField(default=None, null=True, blank=True)),
                ('source', models.ForeignKey(related_name='svm_models', to=settings.AUTH_USER_MODEL, unique=True)),
                ('source_stage', models.ForeignKey(related_name='svm_models', to='experiment.StageAssignment', unique=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='SVMModelWeight',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('weight', models.FloatField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_updated', models.DateTimeField(auto_now=True, auto_now_add=True)),
                ('code', models.ForeignKey(related_name='weights', to='corpus.Code')),
                ('feature', models.ForeignKey(related_name='weights', to='enhance.Feature')),
                ('svm_model', models.ForeignKey(related_name='weights', to='experiment.SVMModel')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.AlterModelOptions(
            name='stage',
            options={},
        ),
        migrations.RemoveField(
            model_name='messageselection',
            name='is_selected',
        ),
        migrations.RemoveField(
            model_name='messageselection',
            name='message',
        ),
        migrations.RemoveField(
            model_name='messageselection',
            name='stage',
        ),
        migrations.RemoveField(
            model_name='progress',
            name='current_stage',
        ),
        migrations.RemoveField(
            model_name='stage',
            name='features',
        ),
        migrations.RemoveField(
            model_name='stage',
            name='messages',
        ),
        migrations.RemoveField(
            model_name='stage',
            name='order',
        ),
        migrations.RemoveField(
            model_name='stage',
            name='svm_models',
        ),
        migrations.AddField(
            model_name='assignment',
            name='stages',
            field=models.ManyToManyField(related_name='assignments', through='experiment.StageAssignment', to='experiment.Stage'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='messageselection',
            name='stage_assignment',
            field=models.ForeignKey(default=None, to='experiment.StageAssignment'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='progress',
            name='current_message_index',
            field=models.IntegerField(default=0),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='progress',
            name='current_stage_index',
            field=models.IntegerField(default=0),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='progress',
            name='status',
            field=models.CharField(default=b'C', max_length=1, choices=[(b'C', b'Coding'), (b'R', b'Review')]),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='stage',
            name='type',
            field=models.CharField(default=b'R', max_length=1, choices=[(b'R', b'Random'), (b'D', b'Disagreement')]),
            preserve_default=True,
        ),
    ]
