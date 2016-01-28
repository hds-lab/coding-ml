from django.db import models
from msgvis.apps.corpus import utils
from msgvis.apps.corpus import models as corpus_models
from msgvis.apps.enhance import models as enhance_models
from django.contrib.auth.models import User
import operator
from django.utils import timezone


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

    dataset = models.ForeignKey(corpus_models.Dataset, related_name='groups')
    """Which :class:`corpus_models.Dataset` this experiment uses"""

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