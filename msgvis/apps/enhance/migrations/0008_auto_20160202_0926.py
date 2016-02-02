# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('enhance', '0007_auto_20160202_0716'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='tweetwordmessageconnection',
            unique_together=set([('message', 'tweet_word', 'order')]),
        ),
    ]
