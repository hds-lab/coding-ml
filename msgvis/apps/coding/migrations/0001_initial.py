# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('enhance', '0009_auto_20160202_1034'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('corpus', '0002_message_has_golden_code'),
    ]

    operations = [
        migrations.CreateModel(
            name='CodeAssignment',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('is_user_labeled', models.BooleanField(default=True)),
                ('probability', models.FloatField(default=1.0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_updated', models.DateTimeField(auto_now=True, auto_now_add=True)),
                ('valid', models.BooleanField(default=True)),
                ('code', models.ForeignKey(related_name='code_assignments', to='corpus.Code')),
                ('message', models.ForeignKey(related_name='code_assignments', to='corpus.Message')),
                ('user', models.ForeignKey(related_name='code_assignments', to=settings.AUTH_USER_MODEL)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.CreateModel(
            name='FeatureAssignment',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_updated', models.DateTimeField(auto_now=True, auto_now_add=True)),
                ('valid', models.BooleanField(default=True)),
                ('feature', models.ForeignKey(related_name='feature_assignments', to='enhance.Feature')),
                ('user', models.ForeignKey(related_name='feature_assignments', to=settings.AUTH_USER_MODEL)),
            ],
            options={
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
                ('user', models.ForeignKey(related_name='svm_models', to=settings.AUTH_USER_MODEL, unique=True)),
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
                ('svm_model', models.ForeignKey(related_name='weights', to='coding.SVMModel')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]
