# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('experiment', '0011_auto_20160225_0834'),
    ]

    operations = [
        migrations.AlterField(
            model_name='messageselection',
            name='stage_assignment',
            field=models.ForeignKey(related_name='selection', default=None, to='experiment.StageAssignment'),
            preserve_default=True,
        ),
        migrations.AlterUniqueTogether(
            name='svmmodel',
            unique_together=set([('source', 'source_stage')]),
        ),
    ]
