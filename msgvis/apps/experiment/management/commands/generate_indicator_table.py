import json
import csv
import codecs

from django.core.management.base import BaseCommand, make_option, CommandError
from django.db.models import Count

from msgvis.apps.base.utils import check_or_create_dir
from msgvis.apps.corpus.models import Code
from msgvis.apps.coding.models import CodeDefinition, CodeAssignment, DisagreementIndicator
from msgvis.apps.experiment.models import Pair, MessageSelection

import logging
logging.basicConfig(format='%(asctime)s : %(levelname)s : %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

def calculate_CohensAlpha(matrix, codes):
    p_a = 0
    p_e = 0
    for code in codes:
        p_a += float(matrix[code][code]) / float(matrix["all"]["all"])
        p_1c = (float(matrix[code]["all"]) / float(matrix["all"]["all"]))
        p_c1 = (float(matrix["all"][code]) / float(matrix["all"]["all"]))
        p_e = p_1c * p_c1

    return float(p_a - p_e) / float(1 - p_e)

class Command(BaseCommand):
    help = "Generate coding related logs."
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

        json.encoder.FLOAT_REPR = lambda o: format(o, '.4f')

        # make sure the folder exists
        check_or_create_dir(output_folder_path)

        indicator_type_map = {
            'N': 'Not specified',
            'U': 'My code is correct',
            'D': 'Unsure',
            'P': 'My partner\'s code is correct'
        }

        pairs = Pair.objects.filter(assignment__experiment_id=experiment_id).select_related('assignment')
        pairs = pairs.prefetch_related('assignment__stage_assignments', 'users', 'users__progress')
        pairs = pairs.order_by('id')

        codes = [code.text for code in Code.objects.all()]
        header = codes + ["all"]

        condition_map = {
            1: "RRRR",
            2: "RDRR",
            3: "RRDR"
        }

        output_filename = "%s/indicator_table.csv" % (output_folder_path)
        with codecs.open(output_filename, encoding='utf-8', mode='w') as f:
            table = []
            table_header = ["pair", "username", "condition", "stage", "type", "indicator", "count"]
            # table.append(header)

            writer = csv.writer(f, delimiter=',')
            writer.writerow(table_header)

            for pair in pairs.all():
                if pair.id > 48:  # Pair > 48 are unused or testing accounts
                    break

                if pair.id == 1 or pair.id == 7: # Pair 1 & Pair 7 used a different setting
                    continue

                user1 = pair.users.all()[0]
                user2 = pair.users.all()[1]

                if not user1.progress.is_finished or not user2.progress.is_finished:
                    continue

                condition = pair.assignment.condition_id
                users = [user1, user2]
                indicator_types = ['U', 'D']

                for user in users:
                    for indicator_type in indicator_types:
                        indicators = DisagreementIndicator.objects.filter(valid=True, type=indicator_type,
                                                                          user_assignment__source=user)

                        indicators = indicators.values('user_assignment__source_stage_index').annotate(count=Count('id'))

                        indicator_type_str = indicator_type_map[indicator_type]
                        for ind in indicators:
                            stage_idx = ind['user_assignment__source_stage_index']
                            stage_type = condition_map[condition][stage_idx]
                            count = ind['count']

                            row = [pair.id, user.username, condition, stage_idx, stage_type, indicator_type_str, count]
                            writer.writerow(row)
