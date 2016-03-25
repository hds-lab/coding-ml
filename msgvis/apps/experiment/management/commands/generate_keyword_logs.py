import json
import codecs
from operator import attrgetter, itemgetter, or_

from django.core.management.base import BaseCommand, make_option, CommandError
from django.db.models import Count

from msgvis.apps.base.utils import AttributeDict, entropy, check_or_create_dir
from msgvis.apps.corpus.models import Code
from msgvis.apps.experiment.models import Pair, Experiment

import logging
logging.basicConfig(format='%(asctime)s : %(levelname)s : %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Generate keyword related logs."
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

        codes = [code.text for code in Code.objects.all()]
        header = codes + ["all"]

        for pair in pairs.all():
            if pair.id > 48:  # Pair > 48 are unused or testing accounts
                break

            if pair.id == 1 or pair.id == 7: # Pair 1 & Pair 7 used a different setting
                continue

            user1 = pair.users.all()[0]
            user2 = pair.users.all()[1]

            if not user1.progress.is_finished or not user2.progress.is_finished:
                continue

            # user1 = user1.username
            # user2 = user2.username

            condition = pair.assignment.condition_id

            experiment = Experiment.objects.get(id=experiment_id)
            dictionary = experiment.dictionary

            results = {
                user1.username: [],
                user2.username: []

            }

            source_map = {
                "system": "system",
                user1.username: user1,
                user2.username: user2,
                user1: user1.username,
                user2: user2.username,
                None: "system"
            }
            users = [user1, user2]
            for user in users:
                # source_list = ["system", user]
                source_list = [user]
                features = dictionary.get_feature_list(source_list)

                distributions = []
                distribution_map = {}
                try:

                    for feature in features:
                        source = feature.source if hasattr(feature, 'source') else "system"

                        item = {
                            "feature_id": feature.id,
                            "feature_index": feature.index,
                            "feature_text": feature.text,
                            "source": source_map[source],
                            "distribution": {},
                            "normalized_distribution": {},
                            "total_count": 0,
                            "entropy": None
                        }

                        if feature.origin:
                            item["origin_message"] = feature.origin.text
                            code = feature.get_origin_message_code()
                            if code:
                                item["origin_code"] = code.text
                        item = AttributeDict(item)
                        for code in codes:
                            item["distribution"][code] = 0
                        distributions.append(item)
                        distribution_map[feature.index] = item

                    counts = features.filter(messages__code_assignments__isnull=False,
                                             messages__code_assignments__source=user,
                                             messages__code_assignments__is_user_labeled=True,
                                             messages__code_assignments__valid=True)\
                        .values('index', 'text', 'messages__code_assignments__code__id', 'messages__code_assignments__code__text')\
                        .annotate(count=Count('messages')).order_by('id', 'count').all()
                    for count in counts:
                        count = AttributeDict(count)
                        distribution_map[count.index]["distribution"][count.messages__code_assignments__code__text] = count.count

                    for item in distributions:
                        item["total_count"] = 0
                        for code in item.distribution:
                            item["total_count"] += item.distribution[code]

                        for code in item.distribution:
                            if item["total_count"] > 0:
                                item.normalized_distribution[code] = float(item.distribution[code]) / float(item["total_count"])
                            else:
                                item.normalized_distribution[code] = 0

                        item["entropy"] = entropy(item.distribution)

                    # first sort by total count
                    distributions.sort(key=attrgetter("total_count"), reverse=True)
                    # Then sort by entropy. The order will be equivalent to (entropy, -total_count)
                    distributions.sort(key=attrgetter("entropy"))

                    results[user.username] = distributions

                except:
                    import traceback
                    traceback.print_exc()
                    import pdb
                    pdb.set_trace()


            filename = "pair_%d__condition_%d" % (pair.id, condition)
            feature_output_filename = "%s/%s__features.log" % (output_folder_path, filename)

            with codecs.open(feature_output_filename, encoding='utf-8', mode='w') as f:
                print >>f, json.dumps(results, indent=3)

