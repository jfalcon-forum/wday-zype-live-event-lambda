import axios from 'axios'
import { JWT } from "google-auth-library";
import { calendar } from "@googleapis/calendar"

const CREDENTIALS = JSON.parse(process.env.CREDENTIALS)
const calendarId = process.env.CALENDAR_ID;
const SCOPES = "https://www.googleapis.com/auth/calendar";
const googleCalendar = new calendar({ version: "v3" });

const auth = new JWT(
  CREDENTIALS.client_email,
  null,
  CREDENTIALS.private_key,
  SCOPES
);

const ENCODERS = {
  'withered-darkness': 'withered-darkness-e75950807bc0776b0e.encode.zype.live',
  'broken-queen': 'broken-queen-8d5cf6d40304984094.encode.zype.live',
  'super-flower': 'super-flower-db0f1e1f330309f108.encode.zype.live',
  'still-surf': 'still-surf-4d0de9a43f0768dba2.encode.zype.live'
}

// Need to include this in the create event to add the Zype Live Event ID to google calendar metadata
const updateGoogleEvent = async (eventId, event) => {
  try {
    const response = await googleCalendar.events.update({
      auth: auth,
      calendarId: calendarId,
      eventId: eventId,
      resource: {
        start: {
          dateTime: event.start.dateTime,
          timeZone: 'America/Chicago'
        },
        end: {
          dateTime: event.end.dateTime,
          timeZone: 'America/Chicago'
        },
        extendedProperties: {
          shared: {
            "zypeVideoId": eventId
          }
        }
      },
    });

    if(response.date !== "") {
      console.log(response.data)
      return response.data;
    } else {
      return "event not updated";
    }
  } catch(error) {
    console.log(`Error at updateEvent --> ${error}`);
    return 0;
  }
}

const createLiveEvent = async (event) => {

  let date = event.start.dateTime;
  let dateArr = date.split("T")
  let formattedDate = dateArr[0]

  const options = {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    url: `https://api.zype.com/live_events?api_key=${process.env.ZYPE_API_KEY}`,
    data: JSON.stringify({
      live_event: {
        title: `${event.summary}-${formattedDate}`,
        description: event.description,
        event_type: event.extendedProperties.shared.eventType,
        on_air_at: event.start.dateTime,
        off_air_at: event.end.dateTime,
        subscription_required: true,
        encoder_name: ENCODERS[event.extendedProperties.shared.encoder],
        auto_archive: true
      }
    })
  };

  const response = await axios.request(options).then((response) => {
    console.log(response.data)
    return response.data
  }).catch((error) => {
    if(error.response) {
      console.log(error)
      return error
    } else {
      return { "message": "Error with request" }
    }
  })
}

const viewLiveEvent = async (id) => {
  const options = {
    method: 'GET',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    url: `https://api.zype.com/live_events/${id}?api_key=${process.env.ZYPE_API_KEY}`,
  };

  const response = await axios.request(options).then((response) => {
    return response.data
  }).catch((error) => {
    if(error.response) {
      return error
    } else {
      return { "message": "Error with request" }
    }
  })
}

const deleteLiveEvent = async (id) => {
  const options = {
    method: 'DELETE',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    url: `https://api.zype.com/live_events/${id}?api_key=${process.env.ZYPE_API_KEY}`,
  };

  const response = await axios.request(options).then((response) => {
    return response.data
  }).catch((error) => {
    if(error.response) {
      return error
    } else {
      return { "message": "Error with request" }
    }
  })
}

// unfinished; needed to update thumbnail as of now; filled with test values
const updateLiveEventVideo = async (event, id) => {
  const options = {
    method: 'PUT',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    url: `https://api.zype.com/videos/${id}?api_key=${process.env.ZYPE_API_KEY}`,
    data: JSON.stringify({
      video: {
        custom_thumbnail_url: 'https://upload.wikimedia.org/wikipedia/en/5/53/Snoopy_Peanuts.png',
        title: 'DEMO_EVENT-2022-12-02'
      }
    })
  }
}

export const handler = async (event) => {
  const result = await createLiveEvent(event)
  console.log(result)
  return result
}