from django.db import migrations

from rachas.nomes import formatar_nome


def padronizar(apps, schema_editor):
    User = apps.get_model('rachas', 'User')
    for user in User.objects.only('id', 'first_name', 'last_name').iterator():
        primeiro = formatar_nome(user.first_name or '')
        ultimo = formatar_nome(user.last_name or '', inicio=False)
        if (primeiro, ultimo) != (user.first_name, user.last_name):
            User.objects.filter(pk=user.pk).update(first_name=primeiro, last_name=ultimo)


class Migration(migrations.Migration):
    dependencies = [
        ('rachas', '0010_album_figurinhas'),
    ]

    operations = [
        migrations.RunPython(padronizar, migrations.RunPython.noop),
    ]
