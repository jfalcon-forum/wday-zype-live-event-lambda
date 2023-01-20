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

// formats date to central time in ISO format
const dateISOFormat = (date) => {
  let isoDate = date.toISOString()
  let trimmedDate = isoDate.substring(0, isoDate.length - 1)
  return `${trimmedDate}+06:00`
}

const withinDay = (date) => {
  const timePeriod = 60 * 60 * 24 * 1000
  const withinDayLow = Date.now() - timePeriod
  const withinDayHigh = Date.now() + timePeriod

  let dateComp = new Date(date)

  if (dateComp.getTime() > withinDayLow && dateComp.getTime() < withinDayHigh) {
    return true
  } else {
    return false
  }
}

// get recent googleEvent Instances
const getGoogleEventInstances = async (eventId, today, month) => {
  const sortByDate = arr => {
    const sorter = (a, b) => {
      return new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime();
    }
    return arr.sort(sorter);
  };

  try {
    const response = await googleCalendar.events.instances({
      auth: auth,
      calendarId: calendarId,
      eventId: eventId,
      timeMax: month,
      timeMin: today
    });

    const items = await response["data"]["items"];
    const sortedItems = await sortByDate(items)
    return sortedItems;
  } catch (error) {
    console.log(`Error at getEventInstances --> ${error}`);
    return 0;
  }
}

// Need to include this in the create event to add the Zype Live Event ID to google calendar metadata
const updateGoogleEvent = async (zypeId, event) => {
  try {
    const response = await googleCalendar.events.update({
      auth: auth,
      calendarId: calendarId,
      eventId: event.id,
      resource: {
        summary: event.summary,
        description: event.description,
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
            "zypeId": zypeId,
            "encoder": event.extendedProperties.shared.encoder,
            "eventType": event.extendedProperties.shared.eventType,
            "offAirImage": event.extendedProperties.shared.offAirImage,
            "archive": "true",
            "scheduledTime": event.extendedProperties.shared.scheduledTime
          }
        }
      },
    });

    if(response.date !== "") {
      return response.data;
    } else {
      return "event not updated";
    }
  } catch(error) {
    console.log(`Error at updateEvent --> ${error}`);
    return 0;
  }
}

const createLiveEventZype = async (event, formattedDate) => {
  const options = {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    url: `https://api.zype.com/live_events?api_key=LUI7LwMgHqzGxGMwWvdEixorDmtHsA2cAaYAtsED2jmsDz0FUFNf4dwxe5IP50o4`,
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
    return response.data
  }).catch((error) => {
    if(error.response) {
      return error
    } else {
      return { "message": "Error with request" }
    }
  })
  
  return response
}

// offAirImage MUST include HTTP or HTTPS
const updateLiveEventVideo = async (event, id, formattedDate) => {
  const options = {
    method: 'PUT',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    url: `https://api.zype.com/videos/${id}?api_key=LUI7LwMgHqzGxGMwWvdEixorDmtHsA2cAaYAtsED2jmsDz0FUFNf4dwxe5IP50o4`,
    data: JSON.stringify({
      video: {
        custom_thumbnail_url: event.extendedProperties.shared.offAirImage,
        title: `${event.summary}-${formattedDate}`
      }
    })
  }

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

// Need to configure future ticket
const addVideoToPlaylist = async (playlistId, videoId) => {
  const options = {
    method: 'PUT',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    url: `https://api.zype.com/playlists/${playlistId}/add_videos?api_key=LUI7LwMgHqzGxGMwWvdEixorDmtHsA2cAaYAtsED2jmsDz0FUFNf4dwxe5IP50o4`,
    data: JSON.stringify({
      video_id: [videoId]
    })
  }

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

const createLiveEvent = async (event) => {
  let today = new Date();
  let month = new Date(today.getTime() + (60 * 60 * 24 * 30 * 1000));
  let formattedToday = dateISOFormat(today)
  let formattedMonth = dateISOFormat(month)

  let eventInstanceArr = await getGoogleEventInstances(event.recurringId, formattedToday, formattedMonth)
  let upcomingEvent = eventInstanceArr[0]

  // fail safe in case a user creates an event thru google calendar directly
  if (upcomingEvent.extendedProperties === undefined) {
    return {"message": "Event doesn't contain a ZypeId property. Delete event and recreate via WDAY+ Event Scheduler"}
  }

  if (upcomingEvent.extendedProperties.shared.zypeId === "") {
    let date = upcomingEvent.start.dateTime;
    let dateArr = date.split("T")
    let formattedDate = dateArr[0]

    // create zype live event
    const zypeResponse = await createLiveEventZype(upcomingEvent, formattedDate)
    let zypeId = zypeResponse.response._id
    // update zype thumbnail if necessary
    if (upcomingEvent.extendedProperties.shared.offAirImage.length > 1) {
      const updatedZypeResource = await updateLiveEventVideo(upcomingEvent, zypeId, formattedDate)
    }
    // Place to put Playlist Update Code
    // updating the google event with the zypeId
    const completeEvent = await updateGoogleEvent(zypeId, upcomingEvent)
    return completeEvent
  } else {
    // Skipping the current event creation because next event already exists
    return {"message": "Next schedule live event has already been created"}
  } 
}

export const handler = async (event, context) => {
    const result = await createLiveEvent(event)
    return result
}