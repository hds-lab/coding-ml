import json
import csv
import codecs

from django.core.management.base import BaseCommand, make_option, CommandError

from msgvis.apps.base.utils import check_or_create_dir
from msgvis.apps.corpus.models import Code
from msgvis.apps.coding.models import CodeDefinition, CodeAssignment, DisagreementIndicator
from msgvis.apps.experiment.models import Pair, ActionHistory

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

        condition_map = {
            1: "RRRR",
            2: "RDRR",
            3: "RRDR"
        }

        output_filename = "%s/keyword_count_table.csv" % (output_folder_path)
        with codecs.open(output_filename, encoding='utf-8', mode='w') as f:
            table = []
            header = ["username", "condition", "stage_order", "type", "count"]
            # table.append(header)

            writer = csv.writer(f, delimiter=',')
            writer.writerow(header)

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

                for user in users:
                    stage_count = [0, 0, 0, 0]
                    definition_change_history = ActionHistory.objects.filter(type="addFeature", owner=user).all()
                    for record in definition_change_history:
                        stage_count[record.stage_index] += 1
                    for idx, count in enumerate(stage_count):
                        stage_type = condition_map[condition][idx]
                        row = [user.username, condition, idx, stage_type, count]
                        # table.append(row)
                        writer.writerow(row)
