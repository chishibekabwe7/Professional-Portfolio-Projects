# Google Forms CLONE

<details>
<summary>
More screenshots
</summary>


- Note that this Google Forms CLONE don't support image uploading due to [Heroku policy](https://help.heroku.com/K1PPS2WM/why-are-my-file-uploads-missing-deleted)

</details>
## Built using:
- Python with Django framework and Jinja templating language
- Vanilla Javascript

## Getting started:
- Clone this repository or fork it
    - To clone this repository type git clone `https://github.com/kimlimjustin/google-form-clone.git` on your command line
    - To fork this repository, click fork button of this repository then type git clone `https://github.com/<your username>/google-form-clone.git`
- Install all the dependencies of this project by typing `pip install -r requirements.txt`
- Migrate the database by typing `python manage.py migrate` on the command line
- Run the project locally by typing `python manage.py runserver` on the command line
    - NB: to run it on your local network, type `python manage.py runserver 0.0.0.0:8000`
- You project will be accessible in your localhost or local network.

## Deployment
For deployment, open `form/settings.py` file and uncomment code from line 131 to 159.


# Love my work?

<a href='https://ko-fi.com/kimlimjustin' target='_blank'><img height='35' style='border:0px;height:34px;' src='https://az743702.vo.msecnd.net/cdn/kofi3.png?v=0' border='0' alt='Buy Me a Coffee at ko-fi.com' />