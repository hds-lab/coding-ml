# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('corpus', '0004_auto_20160224_1002'),
        ('experiment', '0017_auto_20160310_0052'),
    ]

    operations = [
        migrations.CreateModel(
            name='MessageSet',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('experiment', models.ForeignKey(related_name='message_sets', to='experiment.Experiment')),
                ('messages', models.ManyToManyField(related_name='message_sets', to='corpus.Message')),
            ],
            options={
            },
            bases=(models.Model,),
        ),
        migrations.RemoveField(
            model_name='stage',
            name='experiment',
        ),
        migrations.RemoveField(
            model_name='stage',
            name='messages',
        ),
        migrations.RemoveField(
            model_name='assignment',
            name='stages',
        ),
        migrations.RemoveField(
            model_name='stageassignment',
            name='stage',
        ),
        migrations.DeleteModel(
            name='Stage',
        ),
        migrations.AddField(
            model_name='condition',
            name='type',
            field=models.CharField(default=b'RRRR', max_length=250, blank=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='experiment',
            name='num_conditions',
            field=models.IntegerField(default=3),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='experiment',
            name='num_message_sets',
            field=models.IntegerField(default=10),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='experiment',
            name='num_stages',
            field=models.IntegerField(default=4),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='stageassignment',
            name='experiment',
            field=models.ForeignKey(related_name='stage_assignments', default=None, to='experiment.Experiment', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='stageassignment',
            name='message_set',
            field=models.ForeignKey(related_name='stage_assignments', default=None, to='experiment.MessageSet', null=True),
            preserve_default=True,
        ),
        migrations.AddField(
            model_name='stageassignment',
            name='type',
            field=models.CharField(default=b'R', max_length=1, choices=[(b'R', b'Random'), (b'D', b'Disagreement')]),
            preserve_default=True,
        ),
        migrations.AlterField(
            model_name='stageassignment',
            name='assignment',
            field=models.ForeignKey(related_name='stage_assignments', default=None, to='experiment.Assignment', null=True),
            preserve_default=True,
        ),
    ]
