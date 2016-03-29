import json
import csv
import codecs

from django.core.management.base import BaseCommand, make_option, CommandError

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

        output_filename = "%s/inter_rater_table.csv" % (output_folder_path)
        with codecs.open(output_filename, encoding='utf-8', mode='w') as f:
            table = []
            table_header = ["pair", "condition", "stage", "type", "init/final", "cohens_alpha"]
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

                user1 = user1.username
                user2 = user2.username

                condition = pair.assignment.condition_id

                matrix_stages = {}
                for idx in range(5):
                    matrix_init = {}
                    for code_1 in header:
                        matrix_init[code_1] = {}
                        for code_2 in header:
                            matrix_init[code_1][code_2] = 0

                    matrix_final = {}
                    for code_1 in header:
                        matrix_final[code_1] = {}
                        for code_2 in header:
                            matrix_final[code_1][code_2] = 0

                    stage_id = idx + 1 if idx < 4 else "overall"
                    matrix_stages[stage_id] = {
                        "init": matrix_init,
                        "final": matrix_final
                    }

                code_assignments = CodeAssignment.objects.exclude(source=None)
                code_assignments = code_assignments.exclude(source__isnull=True)
                code_assignments = code_assignments.filter(source__pair=pair, is_user_labeled=True)
                code_assignments = code_assignments.select_related('source', 'message', 'code')
                code_assignments = code_assignments.prefetch_related('user_disagreement_indicators')
                code_assignments = code_assignments.order_by('created_at')

                code_assignment_map = {}
                message_map = {}

                for code_assignment in code_assignments.all():
                    message_id = code_assignment.message.id
                    username = code_assignment.source.username

                    if message_map.get(message_id) is None:
                        message_map[message_id] = code_assignment.message
                    if code_assignment_map.get(message_id) is None:
                        code_assignment_map[message_id] = {}
                    if code_assignment_map[message_id].get(username) is None:
                        code_assignment_map[message_id][username] = []

                    item = {
                        "code": code_assignment.code.text,
                        "indicator": []
                    }

                    for indicator in code_assignment.user_disagreement_indicators.order_by('created_at').all():
                        if indicator.type != 'N':
                            item["indicator"].append(indicator_type_map[indicator.type])
                    code_assignment_map[message_id][username].append(item)

                assignment = pair.assignment
                message_selection = MessageSelection.objects.filter(stage_assignment__assignment=assignment)
                message_selection = message_selection.select_related('message', 'stage_assignment')
                message_selection = message_selection.order_by('stage_assignment__order', 'order')

                results = []
                for item in message_selection.all():
                    message_id = item.message.id
                    results.append({
                        "stage": item.stage_assignment.order + 1,
                        "order": item.order + 1,
                        "message": message_map[message_id].text,
                        "code_assignments": code_assignment_map[message_id]
                    })
                    user1_init_code = code_assignment_map[message_id][user1][0]['code']
                    user1_final_code = code_assignment_map[message_id][user1][-1]['code']
                    user2_init_code = code_assignment_map[message_id][user2][0]['code']
                    user2_final_code = code_assignment_map[message_id][user2][-1]['code']

                    matrix_stages[item.stage_assignment.order + 1]['init'][user1_init_code][user2_init_code] += 1
                    matrix_stages[item.stage_assignment.order + 1]['init'][user1_init_code]["all"] += 1
                    matrix_stages[item.stage_assignment.order + 1]['init']["all"][user2_init_code] += 1
                    matrix_stages[item.stage_assignment.order + 1]['init']["all"]["all"] += 1

                    matrix_stages[item.stage_assignment.order + 1]['final'][user1_final_code][user2_final_code] += 1
                    matrix_stages[item.stage_assignment.order + 1]['final'][user1_final_code]["all"] += 1
                    matrix_stages[item.stage_assignment.order + 1]['final']["all"][user2_final_code] += 1
                    matrix_stages[item.stage_assignment.order + 1]['final']["all"]["all"] += 1

                    matrix_stages["overall"]['init'][user1_init_code][user2_init_code] += 1
                    matrix_stages["overall"]['init'][user1_init_code]["all"] += 1
                    matrix_stages["overall"]['init']["all"][user2_init_code] += 1
                    matrix_stages["overall"]['init']["all"]["all"] += 1

                    matrix_stages["overall"]['final'][user1_final_code][user2_final_code] += 1
                    matrix_stages["overall"]['final'][user1_final_code]["all"] += 1
                    matrix_stages["overall"]['final']["all"][user2_final_code] += 1
                    matrix_stages["overall"]['final']["all"]["all"] += 1

                for stage_idx in matrix_stages:
                    init_alpha = calculate_CohensAlpha(matrix_stages[stage_idx]['init'], codes)
                    final_alpha = calculate_CohensAlpha(matrix_stages[stage_idx]['final'], codes)
                    stage_type = condition_map[condition][stage_idx - 1] if stage_idx <= 4 else 'A'
                    row = [pair.id, condition, stage_idx, stage_type, 'init', init_alpha]
                    writer.writerow(row)
                    row = [pair.id, condition, stage_idx, stage_type, 'final', final_alpha]
                    writer.writerow(row)
