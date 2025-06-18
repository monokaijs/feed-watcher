import axios from 'axios';

const makeGUID = (length: number) => {
  let result = "";
  let characters = "abcd123456789";
  let charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const randomMutationId = () => {
  return makeGUID(8) + '-' + makeGUID(4) + '-' + makeGUID(4) + '-' + makeGUID(4) + '-' + makeGUID(12);
}


class FbService {
  dtsg: string = '';
  fbId: string = '';
  accessToken: string = '';
  accessTokenExpirationTime: number = new Date().getTime();

  getToken() {

  }

  async isFbSignedIn() {
    const cookies = await chrome.cookies.getAll({
      url: 'https://www.facebook.com',
    });
    return cookies.some(cookie => cookie.name === 'c_user') && cookies.some(cookie => cookie.name === 'xs');
  }

  async authenticate() {
    const cookies = await chrome.cookies.getAll({
      url: 'https://www.facebook.com',
    });
    const fbCookie = cookies.find(cookie => cookie.name === 'c_user');
    if (!fbCookie) throw new Error('Not logged in');
    this.fbId = fbCookie.value;
    this.dtsg = await this.getDTSG();
    this.accessToken = await this.getUniversalAccessToken();
  }

  async getJoinedGroups(uid: string, cursor: string, limit = 8) {
    const {data} = await this.graphQl('5244211935648733', {
      count: limit, cursor: cursor, scale: 1, search: null, id: btoa(`app_collection:${uid}:2361831622:66`),
    });
    if (typeof data !== 'undefined') {
      return data.node['pageItems'];
    } else {
      return [];
    }
  }

  async getPosts(unitId: string, limit: number, since?: number, until?: number, type: 'group' | 'profile' = 'group') {
    // Ensure we have an access token
    if (!this.accessToken) {
      await this.getUniversalAccessToken();
    }

    const {data} = await axios.get(`https://graph.facebook.com/v2.1/${unitId}/${type === 'group' ? 'feed' : 'posts'}`, {
      params: {
        access_token: this.accessToken,
        limit,
        since,
        until,
        fields: 'id,message,created_time,updated_time,is_broadcast,attachments,reactions.limit(0).summary(true),from',
      }
    });

    // Return empty array if no data or no posts in time range (this is normal)
    if (!data || !data.data) {
      throw new Error('Failed to load data from Facebook API');
    }

    return data.data || []; // Return empty array if no posts in time range
  }

  async getUnitId(unitUrl: string, type: 'profile' | 'group') {
    const {data} = await axios.get(unitUrl, {
      headers: {
        'Accept': 'text/html',
      },
      responseType: 'text',
    });
    if (type === 'group') {
      const matches = data.match(/"if_viewer_can_see_highlight_units":\{"id":"(\d+)"/);
      return matches?.[1];
    } else {
      return data.match(
        /(userVanity)(.*)(userID)(.*)(eligibleForProfilePlusEntityMenu)/gi,
      )?.[0]?.match(/(userID)(.*)(eligibleForProfilePlusEntityMenu)/gi)?.[0]?.split('"')?.[2];
    }
  }

  async getUniversalAccessToken() {
    if (this.accessTokenExpirationTime > Date.now()) return this.accessToken;
    const res = await this.graphQl('6494107973937368', {
      input: {
        "client_mutation_id": "4",
        "actor_id": this.fbId,
        "config_enum": "GDP_CONFIRM",
        "device_id": null,
        "experience_id": randomMutationId(),
        "extra_params_json": JSON.stringify({
          "app_id": "350685531728",
          "kid_directed_site": "false",
          "logger_id": `"${randomMutationId()}"`,
          "next": `"confirm"`,
          "redirect_uri": `"https://www.facebook.com/connect/login_success.html"`,
          "response_type": `"token"`,
          "return_scopes": "false",
          "scope": "[\"user_subscriptions\",\"user_videos\",\"user_website\",\"user_work_history\",\"friends_about_me\",\"friends_actions.books\",\"friends_actions.music\",\"friends_actions.news\",\"friends_actions.video\",\"friends_activities\",\"friends_birthday\",\"friends_education_history\",\"friends_events\",\"friends_games_activity\",\"friends_groups\",\"friends_hometown\",\"friends_interests\",\"friends_likes\",\"friends_location\",\"friends_notes\",\"friends_photos\",\"friends_questions\",\"friends_relationship_details\",\"friends_relationships\",\"friends_religion_politics\",\"friends_status\",\"friends_subscriptions\",\"friends_videos\",\"friends_website\",\"friends_work_history\",\"ads_management\",\"create_event\",\"create_note\",\"export_stream\",\"friends_online_presence\",\"manage_friendlists\",\"manage_notifications\",\"manage_pages\",\"photo_upload\",\"publish_stream\",\"read_friendlists\",\"read_insights\",\"read_mailbox\",\"read_page_mailboxes\",\"read_requests\",\"read_stream\",\"rsvp_event\",\"share_item\",\"sms\",\"status_update\",\"user_online_presence\",\"video_upload\",\"xmpp_login\"]",
          "steps": "{}",
          "tp": `"unspecified"`,
          "cui_gk": `"[PASS]:""`,
          "is_limited_login_shim": "false"
        }),
        "flow_name": "GDP",
        "flow_step_type": "STANDALONE",
        "outcome": "APPROVED",
        "source": "gdp_delegated",
        "surface": "FACEBOOK_COMET"
      }
    });

    const uri = res.data.run_post_flow_action.uri;
    if (!uri) throw new Error('Invalid response (0)');
    const queryString = uri.split('?')[1];
    if (!queryString) throw new Error('Invalid response (1)');
    const params = new URLSearchParams(queryString);
    if (!params.has('close_uri')) throw new Error('Invalid response (2)');
    const closeUri = decodeURIComponent(params.get('close_uri')!);
    if (!closeUri.includes('#access_token=')) throw new Error('Invalid response (3)');
    const search = new URLSearchParams(closeUri.split('#')[1]);
    const accessToken = search.get('access_token');
    if (!accessToken) throw new Error('Invalid response (4)');
    this.accessToken = accessToken;
    this.accessTokenExpirationTime = Date.now() + 10 * 60 * 1000; // 10 mins
    return accessToken;
  }


  async getDTSG() {
    const {data} = await axios.get('https://www.facebook.com/', {
      headers: {
        'Accept': 'text/html',
      },
      responseType: 'text',
    });
    const matches = data.match(/"dtsg"\s*:\s*{[^}]*"token"\s*:\s*"([^"]+)"/);
    if (matches) {
      this.dtsg = matches[1];
    } else throw new Error('Failed to authenticate');
    return this.dtsg;
  }

  async graphQl(docId: string, variables: any, friendlyName?: string) {
    if (!this.dtsg) await this.getDTSG();
    const response = await axios({
      method: 'POST',
      url: 'https://www.facebook.com/api/graphql',
      data: {
        doc_id: docId,
        variables: JSON.stringify(variables),
        av: this.fbId,
        fb_dtsg: this.dtsg,
        __user: this.fbId,
        __req: 'r',
        dpr: 1,
        __ccg: 'EXCELLENT',
        fb_api_caller_class: 'RelayModern',
        fb_api_req_friendly_name: friendlyName ?? undefined,
        server_timestamps: 'true',
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': '*/*',
      },
    });
    if (typeof response.data === 'object') {
      return response.data;
    } else {
      // response is string
      if (response.data.includes('\n') && response.data.split('\n').length > 1) {
        return response.data.split('\n').map((line: string) => JSON.parse(line)); // parse line by line
      } else {
        return JSON.parse(response.data);
      }
    }
  }
}

export const fbService = new FbService();
