from operator import itemgetter

from django.db import models
from msgvis.apps.corpus import models as corpus_models
from msgvis.apps.enhance import models as enhance_models
from msgvis.apps.coding import models as coding_models
from django.contrib.auth.models import User
from random import shuffle
from msgvis.apps.coding import utils as coding_utils
from msgvis.apps.base.utils import check_or_create_dir

def create_a_pair(output):

    current_user_count = User.objects.count()

    # user 1
    username1 = "user_%03d" % (current_user_count + 1)
    password1 = User.objects.make_random_password()
    user1 = User.objects.create_user(username=username1,
                                     password=password1)

    # set the user to the default stage
    Progress.objects.get_or_create(user=user1)

    # user 2
    username2 = "user_%03d" % (current_user_count + 2)
    password2 = User.objects.make_random_password()
    user2 = User.objects.create_user(username=username2,
                                     password=password2)

    # set the user to the default stage
    Progress.objects.get_or_create(user=user2)

    pair = Pair()
    pair.save()
    pair.users.add(user1)
    pair.users.add(user2)

    print >> output, "Pair #%d" %(pair.id)
    print >> output, "username: %s | password: %s" %(username1, password1)
    print >> output, "username: %s | password: %s" %(username2, password2)

    return pair


class Experiment(models.Model):
    """
    A model for experiments
    """

    name = models.CharField(max_length=250, default=None, blank=True)
    """The experiment name."""

    description = models.TextField(default="", blank=True)
    """description of the experiments"""

    created_at = models.DateTimeField(auto_now_add=True)
    """The experiment created time"""

    dictionary = models.ForeignKey(enhance_models.Dictionary, related_name='experiments', default=None, null=True)
    """Which :class:`enhance_models.Dictionary` this experiment uses"""

    saved_path_root = models.FilePathField(default=None, blank=True, null=True)
    """The root path of this experiment.
       The svm model in scikit-learn format will be saved in the directories in this path."""

    @property
    def stage_count(self):
        return self.stages.count()

    @property
    def condition_count(self):
        return self.conditions.count()

    @property
    def user_count(self):
        return self.users.count()

    def __repr__(self):
        return self.name

    def __unicode__(self):
        return self.__repr__()

    def initialize_experiment(self, num_conditions, num_stages, num_pairs, output):

        print >>output, "Initializing the experiment with %d conditions." % num_conditions

        # create a list for saving conditions
        condition_list = []
        # create conditions
        for i in range(num_conditions):
            condition_name = "Condition %d" %(i + 1)
            condition = Condition(experiment=self, name=condition_name)
            condition.save()
            condition_list.append(condition)

        print >>output, "For each condition, users will go through %d stages." % num_stages
        # create a list for saving stages

        stage_types = ["R", "D"]

        stage_list = [Stage.objects.create(experiment=self, type="R")]  # The fist stage is always Random by default
        # create stages
        for idx in range(1, num_stages):
            stage = Stage(experiment=self, type=stage_types[idx % len(stage_types)])
            stage.save()
            stage_list.append(stage)

        random_first = [stage_list[0]]
        disagreement_first = [stage_list[0]]

        for idx in range(1, num_stages):
            random_first.append(stage_list[idx])  # DRDRDR
            disagreement_first.append(stage_list[(idx % (num_stages - 1)) + 1])  # RDRDRD

        # random assign messages to each stage. Only a portion of the messages in each stage will be used in the end
        self.random_assign_messages()

        # create a stage for golden code data
        # golden_stage = Stage(experiment=self, order=0)
        # golden_stage.save()
        # self.assign_messages_with_golden_code(golden_stage)

        print >>output, "Each condition has %d pairs." % num_pairs
        print >>output, "Pair list"
        print >>output, "========="
        # create a list for saving pairs
        pair_list = []
        num_total_pairs = num_conditions * num_pairs
        for i in range(num_total_pairs):
            pair = create_a_pair(output)
            pair_list.append(pair)

        print >>output, "Assignment list"
        print >>output, "==============="
        # shuffle pair list for random assignment
        shuffle(pair_list)
        for idx, condition in enumerate(condition_list):
            print >>output, "\nIn %s" % condition.name
            for i in range(num_pairs):
                assignment = Assignment(pair=pair_list[idx * num_pairs + i],
                                        experiment=self,
                                        condition=condition)
                assignment.save()
                if i % 2 == 1:
                    stage_assigned_list = disagreement_first
                else:
                    stage_assigned_list = random_first

                for stage_idx, stage in enumerate(stage_assigned_list):

                    sa = StageAssignment(assignment=assignment, stage=stage, order=stage_idx)
                    sa.save()


                print >>output, "Pair #%d" % pair_list[idx * num_pairs + i].id

    def random_assign_messages(self):
        message_count = self.dictionary.dataset.message_count
        messages = map(lambda x: x, self.dictionary.dataset.message_set.all())
        shuffle(messages)
        num_stages = self.stage_count
        num_per_stage = int(round(message_count / num_stages))

        start = 0
        end = num_per_stage
        for stage in self.stages.all():
            stage.messages.add(*messages[start:end])
            start += num_per_stage
            end += num_per_stage


class Condition(models.Model):
    """
    A model for conditions in an experiment
    """

    name = models.CharField(max_length=250, default=None, blank=True)
    """The condition name."""

    description = models.TextField(default="", blank=True)
    """description of the condition"""

    experiment = models.ForeignKey(Experiment, related_name='conditions')
    """Which :class:`Experiment` this condition belongs to"""

    created_at = models.DateTimeField(auto_now_add=True)
    """The condition created time"""

    @property
    def user_count(self):
        return self.users.count()

    def __repr__(self):
        return "Experiment %s / Condition %s" % (self.experiment.name, self.name)

    def __unicode__(self):
        return self.__repr__()


class Stage(models.Model):
    """
    A model for stages in an experiment
    """
    experiment = models.ForeignKey(Experiment, related_name='stages')
    """Which :class:`Experiment` this condition belongs to"""

    created_at = models.DateTimeField(auto_now_add=True)
    """The condition created time"""

    TYPE_CHOICES = (
        ('R', 'Random'),
        ('D', 'Disagreement'),
    )
    type = models.CharField(max_length=1, choices=TYPE_CHOICES, default='R')

    messages = models.ManyToManyField(corpus_models.Message, related_name="assigned_stages")


    @property
    def message_count(self):
        return self.messages.count()

    def __repr__(self):
        return "Experiment %s / Stage Type %s" % (self.experiment.name, self.type)

    def __unicode__(self):
        return self.__repr__()

    #def get_next_stage(self):
    #    return self.experiment.stages.filter(order__gt=self.order).first()

    #def get_messages_by_code(self, source, code):
    #    messages = self.messages.filter(message_selection__is_selected=True,
    #                                    code_assignments__valid=True,
    #                                    code_assignments__user=source,
    #                                    code_assignments__code=code).all()
    #
    #    return messages


class Pair(models.Model):
    """
    A model for assigning users to a pair
    """
    users = models.ManyToManyField(User, related_name="pair")

    def get_partner(self, current_user):
        for user in self.users.all():
            if user != current_user:
                return user


class Assignment(models.Model):
    """
    A model for assigning pairs to an experiment + a condition
    """
    pair = models.OneToOneField(Pair, related_name="assignment")
    experiment = models.ForeignKey(Experiment, related_name="assignments")
    condition = models.ForeignKey(Condition, related_name="assignments")
    stages = models.ManyToManyField(Stage, related_name="assignments", through="StageAssignment")


class StageAssignment(models.Model):
    class Meta:
        ordering = ["order"]

    assignment = models.ForeignKey(Assignment, related_name="stage_assignments")
    stage = models.ForeignKey(Stage, related_name="stage_assignments")
    order = models.IntegerField()

    selected_messages = models.ManyToManyField(corpus_models.Message, related_name="source_stages",
                                               through="MessageSelection")
    new_features = models.ManyToManyField(enhance_models.Feature, related_name="source_stages")

    def get_svm_model(self, source):
        return self.svm_models.get(source=source)

    def get_next_stage(self):
        return StageAssignment.objects.filter(assignment=self.assignment, order__gt=self.order).first()

    def initialize_stage(self, selected_num=100):
        stage = self.stage
        message_count = self.stage.messages.count()
        messages = map(lambda x: x, self.stage.messages.all())

        if stage.type == 'R':
            # Random select messages from the messages that associate with the stage
            shuffle(messages)

        elif stage.type == 'D':
            # Select messages based on disagreement
            message_with_disagreement_levels = []
            users = self.assignment.pair.users.all()
            for message in messages:
                message_with_disagreement_level = {
                    "message": message,
                    "disagreement": 1
                }
                codes = []
                probs = []
                for user in users:
                    code_assignment = message.code_assignment.get(is_user_labeled=False, source=user, valid=True)
                    codes.append(code_assignment.code)
                    probs.append(code_assignment.probability)

                if codes[0] == codes[1]:
                    message_with_disagreement_level["disagreement"] = -1

                message_with_disagreement_level["disagreement"] *= probs[0] * probs[1]

                message_with_disagreement_levels.append(message_with_disagreement_level)

            message_with_disagreement_levels.sort(key=itemgetter('disagreement'), reverse=True)
            messages = message_with_disagreement_levels

        selected_messages = []
        for idx, message in enumerate(messages[:selected_num]):
            selected_messages.append(MessageSelection(stage_assignment=self, message=message, order=idx))
        MessageSelection.objects.bulk_create(selected_messages)

    def process_stage(self, use_tfidf=False):
        experiment = self.assignment.experiment
        dictionary = experiment.dictionary
        for source in self.assignment.pair.users.all():
            features = dictionary.get_feature_list(source=None)
            features += dictionary.get_feature_list(source=source)  # Get user features
            messages = self.selected_messages.all()

            model_save_path = "%s/%s_stage%d/" % (experiment.saved_path_root, source.username, self.order)
            check_or_create_dir(model_save_path)

            X, y, code_map_inverse = coding_utils.get_formatted_data(source=source, messages=messages,
                                                                     features=features, use_tfidf=use_tfidf)
            lin_clf = coding_utils.train_model(X, y, model_save_path=model_save_path)

            svm_model = SVMModel(user=source, source_stage=self, saved_path=model_save_path)
            svm_model.save()

            weights = []
            for code_index, code_id in code_map_inverse.iteritems():
                for feature_index, feature in enumerate(features):
                    weight = lin_clf.coef_[code_index][feature_index]

                    model_weight = SVMModelWeight(svm_model=svm_model, code_id=code_id,
                                                  feature=feature, weight=weight)

                    weights.append(model_weight)

            SVMModelWeight.objects.bulk_create(weights)

            next_stage = self.get_next_stage()
            next_message_set = next_stage.stage.messages.all()
            next_message_num = next_message_set.count()

            code_assignments = []
            next_X = coding_utils.get_formatted_X(messages=next_message_set, features=features)
            predict_y, prob = coding_utils.get_prediction(lin_clf, next_X)
            for idx, message in enumerate(next_message_set):
                code_id = code_map_inverse[predict_y[idx]]
                probability = prob[idx]
                code_assignment = coding_models.CodeAssignment(message=message, source=source, code_id=code_id,
                                                               is_user_label=False, probability=probability)
                code_assignments.append(code_assignment)
            coding_models.CodeAssignment.objects.bulk_create(code_assignments)


class MessageSelection(models.Model):
    """
    A model for saving message order in a stage
    """
    stage_assignment = models.ForeignKey(StageAssignment, default=None)
    message = models.ForeignKey(corpus_models.Message, related_name="selected_messages", default=None)
    order = models.IntegerField()

    class Meta:
        ordering = ["order"]


class Progress(models.Model):
    """
    A model for recording a user's current stage
    """
    user = models.ForeignKey(User, related_name="progress", unique=True)
    current_stage_index = models.IntegerField(default=0)
    current_message_index = models.IntegerField(default=0)

    STATUS_CHOICES = (
        ('C', 'Coding'),
        ('R', 'Review'),
    )
    status = models.CharField(max_length=1, choices=STATUS_CHOICES, default='C')

    created_at = models.DateTimeField(auto_now_add=True)
    """The code created time"""

    last_updated = models.DateTimeField(auto_now_add=True, auto_now=True)
    """The code updated time"""


class SVMModel(models.Model):
    """
    A model for svm model
    """
    source = models.ForeignKey(User, related_name="svm_models", unique=True)
    source_stage = models.ForeignKey(StageAssignment, related_name="svm_models", unique=True)

    created_at = models.DateTimeField(auto_now_add=True)
    """The svm model created time"""

    last_updated = models.DateTimeField(auto_now_add=True, auto_now=True)
    """The svm model updated time"""

    saved_path = models.FilePathField(default=None, blank=True, null=True)
    """scikit-learn model will be saved in the given path"""


class SVMModelWeight(models.Model):
    """
    A model for svm model weight
    """
    svm_model = models.ForeignKey(SVMModel, related_name="weights")
    code = models.ForeignKey(enhance_models.Code, related_name="weights")
    feature = models.ForeignKey(enhance_models.Feature, related_name="weights")
    weight = models.FloatField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    """The code created time"""

    last_updated = models.DateTimeField(auto_now_add=True, auto_now=True)
    """The code updated time"""