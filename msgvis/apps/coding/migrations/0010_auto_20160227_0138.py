# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('coding', '0009_remove_codedefinition_examples'),
    ]

    operations = [
        migrations.AlterField(
            model_name='disagreementindicator',
            name='type',
            field=models.CharField(default=b'N', max_length=1, choices=[(b'N', b'Not specified'), (b'U', b'My code is correct'), (b'D', b'My partner and I disagree'), (b'P', b"My partner's code is correct")]),
            preserve_default=True,
        ),
    ]
