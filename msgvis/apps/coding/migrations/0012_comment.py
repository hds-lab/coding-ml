# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings
import msgvis.apps.base.models


class Migration(migrations.Migration):

    dependencies = [
        ('corpus', '0006_auto_20161101_0328'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('coding', '0011_codeassignment_source_stage_index'),
    ]

    operations = [
        migrations.CreateModel(
            name='Comment',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('index', models.IntegerField()),
                ('text', msgvis.apps.base.models.Utf8CharField(max_length=300)),
                ('created_at', models.DateTimeField(default=None, auto_now_add=True)),
                ('valid', models.BooleanField(default=True)),
                ('message', models.ForeignKey(related_name='comments', default=None, to='corpus.Message', null=True)),
                ('source', models.ForeignKey(related_name='comments', default=None, to=settings.AUTH_USER_MODEL, null=True)),
            ],
            options={
            },
            bases=(models.Model,),
        ),
    ]
