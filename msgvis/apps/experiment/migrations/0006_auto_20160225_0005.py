# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('corpus', '0004_auto_20160224_1002'),
        ('experiment', '0005_auto_20160225_0003'),
    ]

    operations = [
        migrations.AddField(
            model_name='messageselection',
            name='message',
            field=models.ForeignKey(related_name='selected_messages', default=None, to='corpus.Message'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='stage',
            name='messages',
            field=models.ManyToManyField(related_name='assigned_stages', to='corpus.Message'),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='stageassignment',
            name='selected_messages',
            field=models.ManyToManyField(related_name='source_stages', through='experiment.MessageSelection', to='corpus.Message'),
            preserve_default=True,
        ),
    ]
