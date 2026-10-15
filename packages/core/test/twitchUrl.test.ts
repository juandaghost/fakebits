import { channelFromTwitchUrl } from '../src';

describe('channelFromTwitchUrl', () => {
  it.each([
    ['https://www.twitch.tv/SomeStreamer', 'somestreamer'],
    ['https://www.twitch.tv/somestreamer/', 'somestreamer'],
    ['https://twitch.tv/somestreamer?referrer=raid', 'somestreamer'],
    ['https://www.twitch.tv/somestreamer/videos', 'somestreamer'],
    ['https://www.twitch.tv/somestreamer/clip/Abc', 'somestreamer'],
    ['https://www.twitch.tv/popout/somestreamer/chat', 'somestreamer'],
    ['https://www.twitch.tv/embed/somestreamer/chat', 'somestreamer'],
    ['https://www.twitch.tv/moderator/somestreamer', 'somestreamer'],
  ])('%s -> %s', (url, channel) => {
    expect(channelFromTwitchUrl(url)).toBe(channel);
  });

  it.each([
    'https://www.twitch.tv/',
    'https://www.twitch.tv/directory/category/just-chatting',
    'https://www.twitch.tv/videos/123456',
    'https://www.twitch.tv/settings/profile',
    'https://www.twitch.tv/popout/',
    'https://www.twitch.tv/popout/directory/chat',
    'https://www.twitch.tv/not%20a%20login',
    'https://m.twitch.tv/somestreamer',
    'https://dashboard.twitch.tv/u/somestreamer',
    'https://example.com/somestreamer',
    'not a url',
  ])('%s -> undefined', (url) => {
    expect(channelFromTwitchUrl(url)).toBeUndefined();
  });
});
