# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('corpus', '0001_initial'),
        ('enhance', '0006_feature_source'),
        ('experiment', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='CodeAssignment',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_updated', models.DateTimeField(auto_now=True, auto_now_add=True)),
                ('valid', models.BooleanField(default=True)),
                ('code', models.ForeignKey(related_name='code_assignments', to='corpus.Code')),
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
        migrations.RemoveField(
            model_name='experiment',
            name='dataset',
        ),
        migrations.AddField(
            model_name='experiment',
            name='dictionary',
            field=models.ForeignKey(related_name='experiments', default=None, to='enhance.Dictionary', null=True),
            preserve_default=True,
        ),
    ]
