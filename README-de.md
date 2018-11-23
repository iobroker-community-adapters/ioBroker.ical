![Logo](admin/ical.png)
ioBroker iCal adapter
=================
iCal liest Kalender Files im .ics Format von einer URL (Google Calendar oder iCal).

## Changelog
Sehe englische [Version](README.md). 

## Install

```node iobroker.js add ical```

## Benutzung
Basiert auf iCal Adapter für (CCU.IO)[https://github.com/hobbyquaker/ccu.io/tree/master/adapter/ical] von vader722

### Adapter iCal
Der Adapter iCal für ioBroker liest Kalender Files im .ics Format von einer URL ein und schreibt Termine, welche in einem definierbaren Zeitraum liegen in eine ioBroker Variable. 
Die Termine werden zeilenweise durch ein Tag voneinander getrennt und können z.B. mit dem ioBroker.vis Widget "basic val - String (unescaped)" in Angezeigt werden.

Es werden 4 Variablen angelegt:

#### trigger 
Die Variable *trigger* dient zum Triggern des Einlesevorgangs. In den Settings können mehrere URLs hinterlegt werden, von welchen der Kalender eingelesen wird. Die Kalender werden dann nacheinander eingelesen und das Ergebnis zusammengefasst. Alternativ kann dem Lesebefehl auch eine URL mitgegeben werden, um z.B. zeitweilig einen anderen Kalender einzulesen.
 
- zum Einlesen von den konfigurierten URLs muss der String "read" in die Variable *trigger* geschrieben werden.
- zum Einlesen von einer beliebigen URL muss der String "read URL" in die Variable *trigger* geschrieben werden.

Das Ergebnis liefert der iCal Adapter in die Variablen *data.table*, *data.html*, *data.count*.
Normallerweise wird der Adapter automatisch in einem definierbaren Intervall die Kalender abfragen. 

#### data.count
 Anzahl von Ereignisen für heute.

#### data.table
 Javascript-Array mit Ereignisen. z.B:
```
[
    {
		'date' : 'Heute 17:00',
		'event' : 'Ereignis heute',
		'_class' : 'ical_calendar1 ical_today',
		'_date' : '2015-02-18T16:00:00.000Z',
		'_calName' : 'calendar1'
	}, {
		'date' : 'Morgen 19:15',
		'event' : 'Ereignis morgen',
		'_class' : 'ical_calendar1 ical_tomorrow',
		'_date' : '2015-02-19T18:15:00.000Z',
		'_calName' : 'calendar1'
	}, {
		'date' : '23.02.2015',
		'event' : 'Geburtstag',
		'_class' : 'ical_calendar1',
		'_date' : '2015-02-19T00:00:00.000Z',
		'_calName' : 'calendar1'
	}, {
		'date' : '23.02.2015 14:15',
		'event' : 'Müllabfuhr',
		'_class' : 'ical_calendar1 ',
		'_date' : '2015-02-23T13:15:00.000Z',
		'_calName' : 'calendar1'
	}
]
```  

#### data.html
 HTML Text Ereignisen. z.B:
```
<span style="font-weight: bold; color:red"><span class="icalWarn">Heute 17:00</span></span><span style="font-weight: normal; color:red"><span class="icalWarn2">Ereignis heute</span></span><br>
<span style="font-weight: bold; color:red"><span class="icalPreWarn">Morgen 19:15</span></span><span style="font-weight: normal; color:red"><span class="icalPreWarn2">Ereignis morgen</span></span><br>
23.02.2015   Geburtstag<br>
23.02.2015 14:15 Müllabfuhr<br>
```  

Bedeutung der Optionen im Konfiguration:

- "Tagesvorschau" : 7 heisst, dass Termine 7 Tage im voraus angezeigt werden;
- "Benutze Fraben für HTML": true Termine am heutigen Tag werden rot gefärbt, Termine am morgigen Tag orange, diese Option überstimmt die Option everyCalOneColor
- "Default-Farbe für HTML": "white" legt die Standardfarbe der Kalendereinträge fest
- "Ersetze 00:00 mit": " " legt fest durch welchen String bei ganztägigen Terminen die Uhrzeit 00:00 ersetzt wird. Bei Leerzeichen (zwischen den Hochkommas) wird dir Uhrzeit bei ganztägigen Terminen weggelassen
- "Ersetze Datum mit Worten": true Bei true wird bei heutigen Terminen das heutige Datum durch den String todayString ersetzt (z.B. "Heute"). Bei morgigen Terminen durch den String tomorrowString
- "Jeder Kalendar hat eigene Farbe": " false Bei true wird bei mehreren Kalendern jeder Kalender in einer festzulegenden Farbe eingefärbt. Ist die Option colorize gesetzt, funktioniert dies nicht!
- "Kalendar": es können beliebig viele Kalender eingetragen werden. Farbe des Kalenders, wirh nur benutzt, wenn die Option "Jeder Kalendar hat eigene Farbe" gesetzt ist.
- "Ereignise": Durch setzen eines Events (in diesem Beispiel „Vacation“), werden die Kalender nach dem String „Vacation“ durchsucht. Sollte ein Termin am heutigen Tage (ganztägige Termine) oder zur aktuellen Uhrzeit mit dem Stichwort „Vacation“ in einem Kalender stehen, so wird automatisch eine Variable mit dem Namen **ical.0.events.Vacation** auf "true" gesetzt. Ist der Termin vorbei, wird die Variable wieder auf "false" gesetzt. Die Variablen werden automatisch unter **ical.X.events.YYY** angelegt. Achtung! Es wird nach einem Substring gesucht, d.h. ein Eintrag im Kalender „Vacation“ wird genauso erkannt wie ein Eintrag „My parents Vacation“. Dies ist beim festlegen der Ereignisse zu berücksichtigen. Groß- und Kleinschreibung wird unterschieden.

    * "aktiviert" - legt fest, ob das Event bearbeitet wird.
    * "anzeigen": - legt fest, ob das Event auch in dem *data.html* angezeigt wird, oder nur ausgewertet wird 

Durch Anpassen der dashui-user.css können die Styles von heutigen (Standard rot) und morgigen Terminen (Standard Orange) festegelegt werden: 

* iCalWarn     - Zeilenanfang Kalendereintrag heute
* iCalWarn2    - Zeilenende Kalendereintrag heute
* iCalPreWarn  - Zeilenanfang Kalendereintrag morgen 
* iCalPreWarn2 - Zeilenende Kalendereintrag morgen
* iCalNormal   - Zeilenanfang von nicht heute und morgen 
* iCalNormal2  - Zeilenende von nicht heute und morgen

### Kalneder
#### Apple iCloud
Apple iCloud Kalender können angezeigt werden, wenn sie vorher freigegeben werden. Am besten einen eigenen Kalender für die Homematic anlegen, da der Kalender fuer alle freigegeben wird.
Dazu mit der rechten Maustaste auf dem Kalender in der Kalender App klicken und Freigabeeinstellungen auswählen. Jetzt einen Haken bei "Öffentlicher Kalender" setzen und die angezeigte URL kopieren. WICHTIG: die Url beginnt mit webcal://p0X-cale.....
"webcal" muss durch "http" ersetzt werden. Diese URL dann entweder in den Settings bei defaultURL eintragen, oder sie bei "read URL" angeben, also z.B. "readURL http://p-03-calendarws.icloud.com/xxxxxxxxx"

#### Google Kalender
Zum Einbinden eines Google Kalenders muss die Kalendereinstellung des Google Kalenders aufgerufen werden (mit der Maus auf "runter Pfeil" neben dem Kalender klicken). Die URL des Kalenders bekommt man durch klicken auf das "ICAL" Symbol neben dem Feld "Privatadresse". Diese URL dann entweder in den Settings bei defaultURL eintragen, oder sie bei "read URL" angeben, also z.B. "readURL https://www.google.com/calendar/ical/xxxxxxxx/basic.ics".
Known BUGS: Probleme mit gleichen UUIDs von iCal Einträgen (bedingt durch Bibliothek); sich wiederholende Termine, in welchen einzelne Termine ausgenommen werden funktionieren nicht. Die Bibliothek verarbeitet keine EXDATES.

![Logo](doc/google-de1.png)

Danach das Link hier kopieren:
![Logo](doc/google-de2.png)
