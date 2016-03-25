import json
import codecs

from django.core.management.base import BaseCommand, make_option, CommandError

from msgvis.apps.base.utils import check_or_create_dir
from msgvis.apps.corpus.models import Code
from msgvis.apps.coding.models import CodeDefinition, CodeAssignment, DisagreementIndicator
from msgvis.apps.experiment.models import Pair, MessageSelection

import logging
logging.basicConfig(format='%(asctime)s : %(levelname)s : %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Generate definition related logs."
    args = '<experiment_id> <output_folder_path>'
    option_list = BaseCommand.option_list + (
    #    make_option('-a', '--action',
    #                default='all',
    #                dest='action',
    #                help='Action to run [all|similarity]'
    #    ),

    )

    def handle(self, experiment_id, output_folder_path, **options):

        if not experiment_id:
            raise CommandError("Dataset id is required.")
        try:
            experiment_id = int(experiment_id)
        except ValueError:
            raise CommandError("Dataset id must be a number.")

        if not output_folder_path:
            raise CommandError("Output folder is required.")

        # make sure the folder exists
        check_or_create_dir(output_folder_path)
        
        pairs = Pair.objects.filter(assignment__experiment_id=experiment_id).select_related('assignment')
        pairs = pairs.prefetch_related('users', 'users__progress')
        pairs = pairs.order_by('id')

        for pair in pairs.all():
            if pair.id > 48:  # Pair > 48 are unused or testing accounts
                break

            if pair.id == 1 or pair.id == 7: # Pair 1 & Pair 7 used a different setting
                continue

            user1 = pair.users.all()[0]
            user2 = pair.users.all()[1]

            if not user1.progress.is_finished or not user2.progress.is_finished:
                continue

            user1 = user1.username
            user2 = user2.username

            condition = pair.assignment.condition_id
          
            code_definitions = CodeDefinition.objects.exclude(source=None)
            code_definitions = code_definitions.exclude(source__isnull=True)
            code_definitions = code_definitions.exclude(text="")
            code_definitions = code_definitions.filter(source__pair=pair)
            code_definitions = code_definitions.select_related('source', 'code')            
            code_definitions = code_definitions.order_by('created_at')

            code_definition_map = {}

            for code_definition in code_definitions.all():
                code = code_definition.code.text
                username = code_definition.source.username

                if code_definition_map.get(code) is None:
                    code_definition_map[code] = {}
                if code_definition_map[code].get(username) is None:
                    code_definition_map[code][username] = []

                item = {
                    "definition": code_definition.text,
                    "examples": [ ex.text for ex in code_definition.examples ]
                }

                code_definition_map[code][username].append(item)

            filename = "pair_%d__condition_%d" % (pair.id, condition)
            definition_output_filename = "%s/%s__definitions.log" % (output_folder_path, filename)

            with codecs.open(definition_output_filename, encoding='utf-8', mode='w') as f:
                print >>f, json.dumps(code_definition_map, indent=3)

