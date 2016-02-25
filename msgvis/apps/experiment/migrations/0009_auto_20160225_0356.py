# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('experiment', '0008_auto_20160225_0313'),
    ]

    operations = [
        migrations.RenameField(
            model_name='progress',
            old_name='status',
            new_name='current_status',
        ),
    ]
