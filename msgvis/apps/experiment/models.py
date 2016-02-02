from django.db import models
from msgvis.apps.corpus import utils
from msgvis.apps.corpus import models as corpus_models
from msgvis.apps.enhance import models as enhance_models
from django.contrib.auth.models import User
import operator
from django.utils import timezone
from random import shuffle


def create_a_pair(output):

    current_user_count = User.objects.count()

    username1 = "user_%3d" % (current_user_count + 1)
    password1 = User.objects.make_random_password()
    user1 = User.objects.create_user(username=username1,
                                     password=password1)

    username2 = "user_%3d" % (current_user_count + 2)
    password2 = User.objects.make_random_password()
    user2 = User.objects.create_user(username=username2,
                                     password=password2)

    pair = Pair(user1=user1, user2=user2)
    pair.save()

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

        print >>output, "Initializing the experiment with %d conditions." %num_conditions

        # create a list for saving conditions
        condition_list = []
        # create conditions
        for i in range(num_conditions):
            condition_name = "Condition %d" %(i + 1)
            condition = Condition(experiment=self, name=condition_name)
            condition.save()
            condition_list.append(condition)

        print >>output, "For each condition, users will go through %d stages." %num_stages
        # create a list for saving stages
        stage_list = []
        # create stages
        for i in range(1, num_stages + 1):
            stage = Stage(experiment=self, order=i)
            stage.save()
            stage_list.append(stage)

        # random assign messages
        self.random_assign_messages()

        print >>output, "Each condition has %d pairs." %num_pairs
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
            print >>output, "\nIn %s" %(condition.name)
            for i in range(num_pairs):
                assignment = Assignment(pair=pair_list[idx * num_pairs + i],
                                        experiment=self,
                                        condition=condition)
                assignment.save()
                print >>output, "Pair #%d" %(pair_list[idx * num_pairs + i].id)

    def random_assign_messages(self):
        message_count = self.dictionary.dataset.message_set.count()
        messages = map(lambda x: x, self.dictionary.dataset.message_set.all())
        shuffle(messages)
        num_stages = self.stage_count
        num_per_stage = int(round(message_count / num_stages))

        start = 0
        end = num_per_stage
        for stage in self.stages.all():
            selection = []
            for idx, message in enumerate(messages[start:end]):
                item = MessageSelection(stage=stage, message=message, order=idx + 1)
                selection.append(item)
            MessageSelection.objects.bulk_create(selection)
            selection = []
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

    order = models.IntegerField()

    experiment = models.ForeignKey(Experiment, related_name='stages')
    """Which :class:`Experiment` this condition belongs to"""

    created_at = models.DateTimeField(auto_now_add=True)
    """The condition created time"""

    messages = models.ManyToManyField(corpus_models.Message, related_name="stages", through="MessageSelection")

    @property
    def message_count(self):
        return self.messages.count()

    def __repr__(self):
        return "Experiment %s / Stage %d" % (self.experiment.name, self.order)

    def __unicode__(self):
        return self.__repr__()

    class Meta:
        ordering = ['order']


class Pair(models.Model):
    """
    A model for assigning users to a pair
    """
    user1 = models.OneToOneField(User, related_name="pairA")
    user2 = models.OneToOneField(User, related_name="pairB")


class Assignment(models.Model):
    """
    A model for assigning pairs to an experiment + a condition
    """
    pair = models.OneToOneField(Pair, related_name="assignment")
    experiment = models.ForeignKey(Experiment, related_name="assignments")
    condition = models.ForeignKey(Condition, related_name="assignments")


class MessageSelection(models.Model):
    """
    A model for saving message order in a stage
    """
    stage = models.ForeignKey(Stage)
    message = models.ForeignKey(corpus_models.Message)
    order = models.IntegerField()

    class Meta:
        ordering = ["order"]


class CodeAssignment(models.Model):
    """
    A model for recording code assignment
    """
    user = models.ForeignKey(User, related_name="code_assignments")
    code = models.ForeignKey(corpus_models.Code, related_name="code_assignments")

    created_at = models.DateTimeField(auto_now_add=True)
    """The code created time"""

    last_updated = models.DateTimeField(auto_now_add=True, auto_now=True)
    """The code updated time"""

    valid = models.BooleanField(default=True)
    """ Whether this code is valid (False indicate the code to the message has been removed) """

class FeatureAssignment(models.Model):
    """
    A model for recording feature assignment
    """
    user = models.ForeignKey(User, related_name="feature_assignments")
    feature = models.ForeignKey(enhance_models.Feature, related_name="feature_assignments")

    created_at = models.DateTimeField(auto_now_add=True)
    """The code created time"""

    last_updated = models.DateTimeField(auto_now_add=True, auto_now=True)
    """The code updated time"""

    valid = models.BooleanField(default=True)
    """ Whether this code is valid (False indicate the code to the message has been removed) """
