from operator import itemgetter
from random import shuffle

from django.db import models
from django.db import transaction
from django.contrib.auth.models import User
from django.utils import timezone
from MySQLdb import OperationalError

from msgvis.apps.corpus import models as corpus_models
from msgvis.apps.enhance import models as enhance_models
from msgvis.apps.coding import models as coding_models
from msgvis.apps.coding import utils as coding_utils
from msgvis.apps.base.utils import check_or_create_dir
from msgvis.apps.stories import models as stories_models

def create_an_user():
    current_user_count = User.objects.exclude(is_superuser=True).count()

    username = "user_%03d" % (current_user_count + 1)
    password = User.objects.make_random_password()
    user = User.objects.create_user(username=username,
                                     password=password)
    return user, username, password

def create_a_pair(output):


    # user 1
    user1, username1, password1 = create_an_user()

    # set the user to the default stage
    Progress.objects.get_or_create(user=user1)

    # user 2
    user2, username2, password2 = create_an_user()
    # set the user to the default stage
    Progress.objects.get_or_create(user=user2)

    pair = Pair()
    pair.save()
    pair.users.add(user1)
    pair.users.add(user2)

    print >> output, "Pair #%d" %(pair.id)
    print >> output, "username: %s | password: %s" %(username1, password1)
    print >> output, "username: %s | password: %s" %(username2, password2)

    return pair, [user1, user2]


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

    num_conditions = models.IntegerField(default=3)

    num_stages = models.IntegerField(default=4)

    num_message_sets = models.IntegerField(default=10)

    users = models.ManyToManyField(User, related_name="experiment")

    isControlled = models.BooleanField(default=True)

    @property
    def user_count(self):
        return self.users.count()

    def __repr__(self):
        return self.name

    def __unicode__(self):
        return self.__repr__()

    def initialize_controlled_experiment(self, num_pairs, output):

        # num_conditions = 3  # hard-coded for our study
        num_conditions = 1  # hard-coded for our study
        # num_stages = 4  # hard-coded for our study
        num_stages = 3  # hard-coded for our study
        num_message_sets = 10  # hard-coded for our study

        self.num_conditions = num_conditions
        self.num_stages = num_stages
        self.num_message_sets = num_message_sets
        self.save()

        print >>output, "Initializing the experiment with %d conditions." % num_conditions

        # create a list for saving conditions
        # condition_types = ["RRRR", "RDRR", "RRDR"]
        condition_types = ["RDD"]
        condition_list = []
        # create conditions
        for i in range(num_conditions):
            condition_name = "Condition %d %s" % ((i + 1), condition_types[i])
            condition = Condition(experiment=self, name=condition_name, type=condition_types[i])
            condition.save()
            condition_list.append(condition)

        print >>output, "For each condition, users will go through %d stages." % num_stages

        #  random assign messages to each set. Only a portion of the messages in each stage will be used in the end
        story_sets = self.random_assign_stories()

        print >>output, "Each condition has %d pairs." % num_pairs
        print >>output, "Pair list"
        print >>output, "========="
        # create a list for saving pairs
        pair_list = []
        user_list = []
        num_total_pairs = num_conditions * num_pairs
        for i in range(num_total_pairs):
            pair, new_users = create_a_pair(output)
            pair_list.append(pair)
            user_list.extend(new_users)

        self.users.add(*user_list)
        user_connections = user_list.map(lambda user: UserExperimentConnect(user=user, experiment=self))
        UserExperimentConnect.objects.bulk_create(user_connections)

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

                # shuffle message sets for random selection
                shuffle(story_sets)
                message_set_ids = []
                for stage_idx, stage_type in enumerate(condition.type):
                    sa = StageAssignment(assignment=assignment, order=stage_idx, type=stage_type,
                                         message_set=story_sets[stage_idx])
                    sa.save()
                    message_set_ids.append(story_sets[stage_idx].id)

                print >>output, "Pair #%d" % pair_list[idx * num_pairs + i].id
                print >>output, message_set_ids

    def initialize_noncontrolled_experiment(self, num_users, output):
        user_list = []

        print >> output, "username\tpassword"
        for idx in range(num_users):
            user, username, password = create_an_user()
            user_list.append(user)

            # save the generated username and password to output file
            print >> output, "%s\t%s" %(username, password)

        self.users.add(*user_list)
        user_connections = map(lambda u: UserExperimentConnect(user=u, experiment=self), user_list)
        UserExperimentConnect.objects.bulk_create(user_connections)

    def random_assign_stories(self):
        stories = self.dictionary.dataset.get_non_master_story_set()
        story_count = stories.count()
        stories = list(stories.all())
        shuffle(stories)
        num_per_stage = int(round(story_count / self.num_story_sets))

        story_sets = []

        start = 0
        end = num_per_stage
        #for story_set in self.story_sets.all():
        for idx in range(self.num_story_sets):
            story_set = StorySet.objects.create(experiment=self)
            story_set.stories.add(*stories[start:end])
            start += num_per_stage
            end += num_per_stage

            story_sets.append(story_set)

        return story_sets

class UserExperimentConnect(models.Model):
    user = models.OneToOneField(User, related_name="experiment_connection")
    experiment = models.ForeignKey(Experiment, related_name="user_connections")

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

    type = models.CharField(max_length=250, default="RRRR", blank=True)
    """The condition type."""

    @property
    def user_count(self):
        return self.users.count()

    def __repr__(self):
        return "Experiment %s / Condition %s" % (self.experiment.name, self.name)

    def __unicode__(self):
        return self.__repr__()


class StorySet(models.Model):
    """
    A model for dividing stories into sets in an experiment
    """
    experiment = models.ForeignKey(Experiment, related_name='story_sets')
    """Which :class:`Experiment` this condition belongs to"""

    created_at = models.DateTimeField(auto_now_add=True)
    """The condition created time"""

    stories = models.ManyToManyField(stories_models.Story_Content, related_name="story_sets")


    @property
    def story_count(self):
        return self.stories.count()

    def __repr__(self):
        return "Experiment %s / %d Messages" % (self.experiment.name, self.story_count)

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


class StageAssignment(models.Model):
    class Meta:
        ordering = ["order"]

    experiment = models.ForeignKey(Experiment, related_name="stage_assignments", default=None, null=True)
    assignment = models.ForeignKey(Assignment, related_name="stage_assignments", default=None, null=True)
    story_set = models.ForeignKey(StorySet, related_name="stage_assignments", default=None, null=True)
    order = models.IntegerField()

    TYPE_CHOICES = (
        ('R', 'Random'),
        ('D', 'Disagreement'),
    )
    type = models.CharField(max_length=1, choices=TYPE_CHOICES, default='R')

    selected_stories = models.ManyToManyField(stories_models.Story_Content, related_name="source_stages",
                                               through="StorySelection")
    new_features = models.ManyToManyField(enhance_models.Feature, related_name="source_stages")

    def get_svm_model(self, source):
        return self.svm_models.get(source=source)

    def get_next_stage(self):
        next_stage = StageAssignment.objects.filter(assignment=self.assignment, order__gt=self.order).first()
        if next_stage is None:
            raise IndexError("No next stage")
        return next_stage

    def initialize_stage(self, selected_num=20):
        message_set = self.message_set
        messages = list(message_set.messages.all())

        if self.type == 'R':
            # Random select messages from the messages that associate with the stage
            shuffle(messages)

        elif self.type == 'D':
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
                    code_assignment = message.code_assignments.filter(is_user_labeled=False, source=user, valid=True).first()
                    codes.append(code_assignment.code)
                    probs.append(code_assignment.probability)

                if codes[0] == codes[1]:
                    message_with_disagreement_level["disagreement"] = -1

                message_with_disagreement_level["disagreement"] *= probs[0] * probs[1]

                message_with_disagreement_levels.append(message_with_disagreement_level)

            message_with_disagreement_levels.sort(key=itemgetter('disagreement'), reverse=True)
            messages = [message_with_disagreement_levels[0]["message"]]
            for idx, item in enumerate(message_with_disagreement_levels[1:], 1):
                if item["message"].text != message_with_disagreement_levels[idx - 1]["message"].text:
                    messages.append(item["message"])


        selected_messages = []
        for idx, msg in enumerate(messages[:selected_num]):
            selected_messages.append(MessageSelection(stage_assignment=self, message=msg, order=idx))
        MessageSelection.objects.bulk_create(selected_messages)

    def process_stage(self, use_tfidf=False):
        experiment = self.assignment.experiment
        dictionary = experiment.dictionary
        try:
            for source in self.assignment.pair.users.all():
                sources = ["system", source]
                features = list(dictionary.get_feature_list(sources))
                messages = self.selected_messages.all()
                master_messages = dictionary.dataset.get_master_message_set().all()

                feature_index_map = {}
                for idx, feature in enumerate(features):
                    feature_index_map[feature.index] = idx

                model_save_path = "%s/%s_stage%d/" % (experiment.saved_path_root, source.username, self.order)
                check_or_create_dir(model_save_path)

                X, y, code_map_inverse = coding_utils.get_formatted_data(dictionary=dictionary,
                                                                         source=source,
                                                                         messages=messages,
                                                                         feature_index_map=feature_index_map,
                                                                         feature_num=len(features),
                                                                         use_tfidf=use_tfidf,
                                                                         master_messages=master_messages)
                lin_clf = coding_utils.train_model(X, y, model_save_path=model_save_path)

                svm_model = SVMModel(source=source, source_stage=self, saved_path=model_save_path)
                svm_model.save()

                weights = []
                for code_index, code_id in code_map_inverse.iteritems():
                    for feature_index, feature in enumerate(features):
                        try:
                            if lin_clf.coef_.shape[0] == 1:
                                weight = lin_clf.coef_[0][feature_index]
                            else:
                                weight = lin_clf.coef_[code_index][feature_index]
                        except:
                            import traceback
                            traceback.print_exc()
                            import pdb
                            pdb.set_trace()


                        model_weight = SVMModelWeight(svm_model=svm_model, code_id=code_id,
                                                      feature=feature, weight=weight)

                        weights.append(model_weight)

                SVMModelWeight.objects.bulk_create(weights)

                try:
                    next_stage = self.get_next_stage()
                except IndexError:
                    pass
                else:
                    next_message_set = next_stage.message_set.messages.all()

                    code_assignments = []
                    next_X = coding_utils.get_formatted_X(messages=next_message_set,
                                                          dictionary=dictionary,
                                                          source=source,
                                                          feature_index_map=feature_index_map,
                                                          feature_num=len(features),
                                                          use_tfidf=use_tfidf)
                    predict_y, prob = coding_utils.get_prediction(lin_clf, next_X)
                    for idx, message in enumerate(next_message_set):
                        code_index = predict_y[idx]
                        code_id = code_map_inverse[code_index]
                        try:
                            if lin_clf.coef_.shape[0] == 1:
                                if code_index == 1:
                                    probability = prob[idx]
                                else:
                                    probability = 1 - prob[idx]
                            else:
                                probability = prob[idx, code_index]
                        except:
                            import traceback
                            traceback.print_exc()
                            import pdb
                            pdb.set_trace()

                        code_assignment = coding_models.CodeAssignment(message=message, source=source, code_id=code_id,
                                                                       is_user_labeled=False, probability=probability)
                        code_assignments.append(code_assignment)

                    coding_models.CodeAssignment.objects.bulk_create(code_assignments)

        except:
            import traceback
            traceback.print_exc()
            import pdb
            pdb.set_trace()


class StorySelection(models.Model):
    """
    A model for saving story order in a stage
    """
    stage_assignment = models.ForeignKey(StageAssignment, related_name="selection", default=None)
    story = models.ForeignKey(stories_models.Story_Content, related_name="selection", default=None)
    order = models.IntegerField()

    @property
    def stage(self):
        return self.stage_assignment.stage

    class Meta:
        ordering = ["order"]


class Progress(models.Model):
    """
    A model for recording a user's current stage
    """
    user = models.OneToOneField(User, related_name="progress", unique=True)
    current_stage_index = models.IntegerField(default=0)
    current_message_index = models.IntegerField(default=0)
    is_finished = models.BooleanField(default=False)

    STATUS_CHOICES = (
        ('N', 'Not yet start'),
        ('I', 'Initialization'),
        ('C', 'Coding'),
        ('W', 'Waiting'),
        ('R', 'Review'),
        ('S', 'Switching stage'),
        ('F', 'Finished'),
    )
    current_status = models.CharField(max_length=1, choices=STATUS_CHOICES, default='N')

    created_at = models.DateTimeField(auto_now_add=True)
    """The code created time"""

    last_updated = models.DateTimeField(auto_now_add=True, auto_now=True)
    """The code updated time"""

    @property
    def current_message_id(self):
        return self.get_current_message().id

    def get_current_stage(self):
        assignment = self.user.pair.first().assignment
        return assignment.stage_assignments.get(order=self.current_stage_index)

    def get_current_message(self):
        current_stage = self.get_current_stage()
        return current_stage.selection.get(order=self.current_message_index).message

    def get_next_message(self):
        current_stage = self.get_current_stage()
        return current_stage.selection.filter(order__gt=self.current_message_index).first()

    def get_next_stage(self):
        current_stage = self.get_current_stage()
        return current_stage.get_next_stage()

    def set_stage(self, target_stage, target_status):
        if self.is_finished and (self.current_stage_index != target_stage or self.current_status != target_status):
            self.current_stage_index = target_stage
            self.current_status = target_status
            self.current_message_index = 0
            self.save()
            return True
        return False

    @transaction.commit_on_success
    def set_to_next_step(self):
        # make sure only one user is making changes to the progress table
        # with transaction.atomic(savepoint=False):
        try:
            query = "SELECT * FROM experiment_progress WHERE id=%d FOR UPDATE" % (self.id)
            self_progress_obj = Progress.objects.raw(query)[0]

            partner = self.user.pair.first().get_partner(self.user)
            partner_progress = partner.progress

        except IndexError:
           # Handle not found
           return
        except OperationalError:
           # Handle lock timeouts
           return
        #import pdb
        #pdb.set_trace()

        if self_progress_obj.is_finished:
            # This is a backdoor to go through stages when an user has already finished
            if self_progress_obj.current_status == 'N':
                self_progress_obj.current_status = 'C'
                self_progress_obj.current_message_index = 0
                self_progress_obj.save()
            elif self_progress_obj.current_status == 'C':
                next_message = self_progress_obj.get_next_message()
                if next_message is None:  # finish coding this stage
                    self_progress_obj.current_status = 'R'
                    self_progress_obj.save()
                else:
                    self_progress_obj.current_message_index = next_message.order
                    self_progress_obj.save()
            elif self_progress_obj.current_status == 'R':
                try:
                    next_stage = self_progress_obj.get_next_stage()
                except IndexError:
                    self_progress_obj.current_status = 'F'
                    self_progress_obj.save()
                    query = "SELECT * FROM experiment_progress WHERE id=%d FOR UPDATE" % (partner_progress.id)
                    partner_progress_obj = Progress.objects.raw(query)[0]
                    partner_progress_obj.current_status = 'F'
                    partner_progress_obj.save()
                else:
                    self_progress_obj.current_status = 'N'
                    self_progress_obj.current_stage_index = next_stage.order
                    self_progress_obj.save()
                    query = "SELECT * FROM experiment_progress WHERE id=%d FOR UPDATE" % (partner_progress.id)
                    partner_progress_obj = Progress.objects.raw(query)[0]
                    partner_progress_obj.current_status = 'N'
                    partner_progress_obj.current_stage_index = next_stage.order
                    partner_progress_obj.save()
            return True, self_progress_obj
        else:
            if self_progress_obj.current_status == 'N':
                self_progress_obj.current_status = 'I'
                self_progress_obj.save()

                # Switch to the next status when both are on the same page
                if self_progress_obj.current_status == 'I' and partner_progress.current_status == 'I':
                    current_stage = self_progress_obj.get_current_stage()
                    current_stage.initialize_stage()
                    self_progress_obj.current_status = 'C'
                    self_progress_obj.current_message_index = 0
                    self_progress_obj.save()
                    query = "SELECT * FROM experiment_progress WHERE id=%d FOR UPDATE" % (partner_progress.id)
                    partner_progress_obj = Progress.objects.raw(query)[0]
                    partner_progress_obj.current_status = 'C'
                    partner_progress_obj.current_message_index = 0
                    partner_progress_obj.save()

                return True, self_progress_obj

            elif self_progress_obj.current_status == 'C':
                current_message = self_progress_obj.get_current_message()

                # Check if the current message has been coded
                if not coding_models.CodeAssignment.objects.filter(is_user_labeled=True, valid=True,
                                                                   source=self_progress_obj.user, message=current_message).exists():
                    return False, self_progress_obj

                next_message = self_progress_obj.get_next_message()
                if next_message is None:  # finish coding this stage
                    self_progress_obj.current_status = 'W'
                    self_progress_obj.save()
                else:
                    self_progress_obj.current_message_index = next_message.order
                    self_progress_obj.save()

                # Switch to the next status when both are on the same page
                if self_progress_obj.current_status == 'W' and partner_progress.current_status == 'W':
                    self_progress_obj.current_status = 'R'
                    self_progress_obj.save()
                    query = "SELECT * FROM experiment_progress WHERE id=%d FOR UPDATE" % (partner_progress.id)
                    partner_progress_obj = Progress.objects.raw(query)[0]
                    partner_progress_obj.current_status = 'R'
                    partner_progress_obj.save()

                return True, self_progress_obj

            elif self_progress_obj.current_status == 'R':
                self_progress_obj.current_status = 'S'
                self_progress_obj.save()

                # Switch to the next status when both are on the same page
                if self_progress_obj.current_status == 'S' and partner_progress.current_status == 'S':
                    current_stage = self_progress_obj.get_current_stage()
                    current_stage.process_stage()
                    self_progress_obj.current_status = 'N'
                    try:
                        next_stage = self_progress_obj.get_next_stage()
                    except IndexError:
                        self_progress_obj.current_status = 'F'
                        self_progress_obj.is_finished = True
                        self_progress_obj.save()
                        query = "SELECT * FROM experiment_progress WHERE id=%d FOR UPDATE" % (partner_progress.id)
                        partner_progress_obj = Progress.objects.raw(query)[0]
                        partner_progress_obj.current_status = 'F'
                        partner_progress_obj.is_finished = True
                        partner_progress_obj.save()
                    else:
                        self_progress_obj.current_stage_index = next_stage.order
                        self_progress_obj.save()
                        query = "SELECT * FROM experiment_progress WHERE id=%d FOR UPDATE" % (partner_progress.id)
                        partner_progress_obj = Progress.objects.raw(query)[0]
                        partner_progress_obj.current_status = 'N'
                        partner_progress_obj.current_stage_index = next_stage.order
                        partner_progress_obj.save()

                return True, self_progress_obj

            else:
                return False, self_progress_obj



class SVMModel(models.Model):
    """
    A model for svm model
    """
    class Meta:
        unique_together = ("source", "source_stage")

    source = models.ForeignKey(User, related_name="svm_models")
    source_stage = models.ForeignKey(StageAssignment, related_name="svm_models")

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


class ActionHistory(models.Model):
    """
    A model to record history
    """

    owner = models.ForeignKey(User, default=None, null=True)

    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    """Created time"""

    from_server = models.BooleanField(default=False)

    type = models.CharField(max_length=100, default="", blank=True, db_index=True)

    contents = models.TextField(default="", blank=True)

    stage_index = models.IntegerField(default=-1)

    STATUS_CHOICES = (
        ('N', 'Not yet start'),
        ('I', 'Initialization'),
        ('C', 'Coding'),
        ('W', 'Waiting'),
        ('R', 'Review'),
        ('S', 'Switching stage'),
        ('F', 'Finished'),
    )
    status = models.CharField(null=True, max_length=1, choices=STATUS_CHOICES, default=None)