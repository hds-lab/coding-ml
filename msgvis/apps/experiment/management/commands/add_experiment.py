from django.core.management.base import BaseCommand, make_option, CommandError
import msgvis.apps.experiment.models as experiment_models

import logging
logging.basicConfig(format='%(asctime)s : %(levelname)s : %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = "Create a new experiment."
    args = '<dataset_id> <output_filename>'
    option_list = BaseCommand.option_list + (
        make_option('-p', '--num_pairs',
                    default=3,
                    dest='num_pairs',
                    help='Num of pairs in each conditions'
        ),
        make_option('-c', '--num_conditions',
                    default=3,
                    dest='num_conditions',
                    help='Num of conditions in this experiment'
        ),
        make_option('-s', '--num_stages',
                    default=3,
                    dest='num_stages',
                    help='Num of stages in each condition'
        ),
        make_option('-n', '--name',
                    default='Experiment',
                    dest='experiment_name',
                    help='Name of this experiment'
        ),

    )

    def handle(self, dataset_id, output_filename, **options):

        if not dataset_id:
            raise CommandError("Dataset id is required.")
        try:
            dataset_id = int(dataset_id)
        except ValueError:
            raise CommandError("Dataset id must be a number.")

        if not output_filename:
            raise CommandError("Output filename is required.")


        num_pairs = options.get('num_pairs')
        num_conditions = options.get('num_conditions')
        num_stages = options.get('num_stages')
        experiment_name = options.get('experiment_name')

        with open(output_filename, "w") as output:
            # create an experiment
            experiment = experiment_models.Experiment(name=experiment_name,
                                                      dataset_id=dataset_id)
            experiment.save()

            experiment.initialize_experiment(num_conditions=num_conditions,
                                             num_stages=num_stages,
                                             num_pairs=num_pairs,
                                             output=output)


