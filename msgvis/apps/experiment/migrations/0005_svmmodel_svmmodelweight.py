# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('experiment', '0004_auto_20160202_1035'),
    ]

    operations = [
        migrations.CreateModel(
            name='SVMModel',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_updated', models.DateTimeField(auto_now=True, auto_now_add=True)),
                ('source_stage', models.ForeignKey(related_name='svm_models', to='experiment.Stage')),
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
                ('svm_model', models.ForeignKey(related_name='weights', to='experiment.SVMModel')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]
