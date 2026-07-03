from django import forms

from .models import CheckIn, Pact, Verification


class PactForm(forms.ModelForm):
    class Meta:
        model = Pact
        fields = ["title", "description", "frequency", "witnesses", "is_active"]
        widgets = {
            "description": forms.Textarea(attrs={"rows": 4}),
            "witnesses": forms.SelectMultiple(attrs={"class": "form-select", "size": 6}),
        }

    def __init__(self, *args, **kwargs):
        accepted_friends = kwargs.pop("accepted_friends", None)
        super().__init__(*args, **kwargs)

        self.fields["title"].widget.attrs.update({"class": "form-control"})
        self.fields["description"].widget.attrs.update({"class": "form-control"})
        self.fields["frequency"].widget.attrs.update({"class": "form-select"})
        self.fields["is_active"].widget.attrs.update({"class": "form-check-input"})
        self.fields["witnesses"].widget.attrs.update({"class": "form-select"})

        if accepted_friends is not None:
            self.fields["witnesses"].queryset = accepted_friends


class CheckInForm(forms.ModelForm):
    class Meta:
        model = CheckIn
        fields = ["note", "photo"]
        widgets = {
            "note": forms.Textarea(attrs={"rows": 4, "class": "form-control"}),
            "photo": forms.ClearableFileInput(attrs={"class": "form-control"}),
        }


class VerificationActionForm(forms.Form):
    decision = forms.ChoiceField(
        choices=Verification.Decision.choices,
        widget=forms.RadioSelect,
    )
    comment = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={"rows": 3, "class": "form-control"}),
    )
