# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('experiment', '0006_auto_20160225_0005'),
    ]

    operations = [
        migrations.AlterField(
            model_name='messageselection',
            name='message',
            field=models.ForeignKey(related_name='selection', default=None, to='corpus.Message'),
            preserve_default=True,
        ),
    ]
