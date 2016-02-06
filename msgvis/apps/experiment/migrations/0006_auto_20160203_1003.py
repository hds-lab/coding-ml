# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('enhance', '0009_auto_20160202_1034'),
        ('corpus', '0002_message_has_golden_code'),
        ('experiment', '0005_svmmodel_svmmodelweight'),
    ]

    operations = [
        migrations.AddField(
            model_name='codeassignment',
            name='is_user_labeled',
            field=models.BooleanField(default=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='codeassignment',
            name='message',
            field=models.ForeignKey(related_name='code_assignments', default=None, to='corpus.Message'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='codeassignment',
            name='probability',
            field=models.FloatField(default=1.0),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='experiment',
            name='saved_path_root',
            field=models.FilePathField(default=None, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='svmmodel',
            name='saved_path',
            field=models.FilePathField(default=None, null=True, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='svmmodelweight',
            name='code',
            field=models.ForeignKey(related_name='weights', default=None, to='corpus.Code'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='svmmodelweight',
            name='feature',
            field=models.ForeignKey(related_name='weights', default=None, to='enhance.Feature'),
            preserve_default=False,
        ),
    ]
