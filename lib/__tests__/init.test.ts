import { getCookie, MONTH } from "../_tokenUtils";
import AlgoliaAnalytics from "../insights";
import * as utils from "../utils";
import { createUUID } from "../utils/uuid";

jest.mock("../utils", () => ({
  __esModule: true,
  ...jest.requireActual("../utils")
}));

describe("init", () => {
  let analyticsInstance: AlgoliaAnalytics;
  beforeEach(() => {
    analyticsInstance = new AlgoliaAnalytics({
      requestFn: jest.fn().mockResolvedValue(true)
    });
    document.cookie = `_ALGOLIA=;${new Date().toUTCString()};path=/`;
  });

  it("should not throw if no parameters are passed", () => {
    expect(() => {
      analyticsInstance.init();
    }).not.toThrowError();
  });
  it("should throw if region is other than `de` | `us`", () => {
    expect(() => {
      analyticsInstance.init({
        appId: "xxx",
        apiKey: "***",
        // @ts-expect-error
        region: "emea"
      });
    }).toThrowErrorMatchingInlineSnapshot(
      `"optional region is incorrect, please provide either one of: de, us."`
    );
  });
  it("should set _appId on instance", () => {
    analyticsInstance.init({ apiKey: "***", appId: "XXX" });
    expect(analyticsInstance._appId).toBe("XXX");
  });
  it("should set _apiKey on instance", () => {
    analyticsInstance.init({ apiKey: "***", appId: "XXX" });
    expect(analyticsInstance._apiKey).toBe("***");
  });
  it("should set _region on instance", () => {
    analyticsInstance.init({ apiKey: "***", appId: "XXX", region: "us" });
    expect(analyticsInstance._region).toBe("us");
  });
  it("should set _host on instance", () => {
    analyticsInstance.init({
      apiKey: "***",
      appId: "XXX",
      host: "https://example.com"
    });
    expect(analyticsInstance._host).toBe("https://example.com");
  });
  it("should set _userHasOptedOut on instance to false by default", () => {
    analyticsInstance.init({ apiKey: "***", appId: "XXX" });
    expect(analyticsInstance._userHasOptedOut).toBe(false);
  });
  it("should set _userHasOptedOut on instance when passed", () => {
    analyticsInstance.init({
      apiKey: "***",
      appId: "XXX",
      userHasOptedOut: true
    });
    expect(analyticsInstance._userHasOptedOut).toBe(true);
  });
  it("should not set anonymous user token when _userHasOptedOut is true", () => {
    analyticsInstance.init({
      apiKey: "***",
      appId: "XXX",
      userHasOptedOut: true
    });
    expect(analyticsInstance._userToken).toBeUndefined();
    expect(getCookie("_ALGOLIA")).toBe("");
  });
  it("should use 6 months cookieDuration by default", () => {
    analyticsInstance.init({ apiKey: "***", appId: "XXX" });
    expect(analyticsInstance._cookieDuration).toBe(6 * MONTH);
  });
  it.each(["not a string", 0.002, NaN])(
    "should throw if cookieDuration passed but is not an integer (eg. %s)",
    (cookieDuration) => {
      expect(() => {
        analyticsInstance.init({
          // @ts-expect-error
          cookieDuration,
          apiKey: "***",
          appId: "XXX"
        });
      }).toThrowErrorMatchingInlineSnapshot(
        `"optional cookieDuration is incorrect, expected an integer."`
      );
    }
  );
  it("should use passed cookieDuration", () => {
    analyticsInstance.init({
      apiKey: "***",
      appId: "XXX",
      cookieDuration: 42
    });
    expect(analyticsInstance._cookieDuration).toBe(42);
  });
  it("should set cookie parameters if defined in `init`", () => {
    expect(analyticsInstance._useCookie).toBe(false);
    expect(analyticsInstance._cookieDuration).toBe(6 * MONTH);

    analyticsInstance.init({ useCookie: true, cookieDuration: MONTH });

    expect(analyticsInstance._useCookie).toBe(true);
    expect(analyticsInstance._cookieDuration).toBe(MONTH);
  });
  it("should set _endpointOrigin on instance to https://insights.algolia.io", () => {
    analyticsInstance.init({ apiKey: "***", appId: "XXX" });
    expect(analyticsInstance._endpointOrigin).toBe(
      "https://insights.algolia.io"
    );
  });
  it("should set _endpointOrigin on instance to https://insights.us.algolia.io if region === 'us'", () => {
    analyticsInstance.init({ apiKey: "***", appId: "XXX", region: "us" });
    expect(analyticsInstance._endpointOrigin).toBe(
      "https://insights.us.algolia.io"
    );
  });
  it("should set _endpointOrigin on instance to https://insights.de.algolia.io if region === 'de'", () => {
    analyticsInstance.init({ apiKey: "***", appId: "XXX", region: "de" });
    expect(analyticsInstance._endpointOrigin).toBe(
      "https://insights.de.algolia.io"
    );
  });
  it("should set _endpointOrigin on instance to https://example.com if host is provided, overriding any region passed", () => {
    analyticsInstance.init({
      apiKey: "***",
      appId: "XXX",
      region: "de",
      host: "https://example.com"
    });
    expect(analyticsInstance._endpointOrigin).toBe("https://example.com");
  });
  it("should set anonymous userToken if environment supports cookies", () => {
    const supportsCookies = jest
      .spyOn(utils, "supportsCookies")
      .mockReturnValue(true);
    const setAnonymousUserToken = jest.spyOn(
      analyticsInstance,
      "setAnonymousUserToken"
    );

    analyticsInstance.init({
      apiKey: "***",
      appId: "XXX",
      region: "de",
      useCookie: true
    });
    expect(setAnonymousUserToken).toHaveBeenCalledTimes(1);

    setAnonymousUserToken.mockRestore();
    supportsCookies.mockRestore();
  });
  it("should set anonymous userToken even if authenticatedUserToken is set", () => {
    const setAuthenticatedUserToken = jest.spyOn(
      analyticsInstance,
      "setAuthenticatedUserToken"
    );
    const setUserToken = jest.spyOn(analyticsInstance, "setUserToken");
    analyticsInstance.init({
      apiKey: "***",
      appId: "XXX",
      useCookie: true,
      authenticatedUserToken: "abc"
    });
    expect(setAuthenticatedUserToken).toHaveBeenCalledTimes(1);
    expect(setAuthenticatedUserToken).toHaveBeenCalledWith("abc");
    expect(setUserToken).toHaveBeenCalledTimes(1);
    expect(setUserToken).toHaveBeenCalledWith(
      expect.stringMatching(/^anonymous-/)
    );

    expect(analyticsInstance._userToken).toEqual(
      expect.stringMatching(/^anonymous-/)
    );
    expect(analyticsInstance._authenticatedUserToken).toBe("abc");

    setAuthenticatedUserToken.mockRestore();
    setUserToken.mockRestore();
  });
  it("should not set anonymous userToken if environment does not supports cookies", () => {
    const supportsCookies = jest
      .spyOn(utils, "supportsCookies")
      .mockReturnValue(false);
    const setUserToken = jest.spyOn(analyticsInstance, "setUserToken");

    analyticsInstance.init({ apiKey: "***", appId: "XXX", region: "de" });
    expect(setUserToken).not.toHaveBeenCalled();

    setUserToken.mockRestore();
    supportsCookies.mockRestore();
  });
  it("should not set anonymous userToken if useCookie is false", () => {
    const supportsCookies = jest
      .spyOn(utils, "supportsCookies")
      .mockReturnValue(true);
    const setAnonymousUserToken = jest.spyOn(
      analyticsInstance,
      "setAnonymousUserToken"
    );

    analyticsInstance.init({
      apiKey: "***",
      appId: "XXX",
      region: "de",
      useCookie: false
    });
    expect(setAnonymousUserToken).not.toHaveBeenCalled();

    setAnonymousUserToken.mockRestore();
    supportsCookies.mockRestore();
  });
  it("should not set anonymous userToken if a token is already set", () => {
    const setUserToken = jest.spyOn(analyticsInstance, "setUserToken");
    analyticsInstance.init({
      apiKey: "***",
      appId: "XXX",
      useCookie: true
    });
    expect(setUserToken).toHaveBeenCalledTimes(1);
    expect(setUserToken).toHaveBeenCalledWith(
      expect.stringMatching(/^anonymous-/)
    );

    analyticsInstance.setUserToken("my-token");
    expect(setUserToken).toHaveBeenCalledTimes(2);
    expect(setUserToken).toHaveBeenLastCalledWith("my-token");

    analyticsInstance.init({
      apiKey: "***",
      appId: "XXX"
    });
    expect(setUserToken).toHaveBeenCalledTimes(2);

    setUserToken.mockRestore();
  });
  it("should save anonymous userToken as cookie when useCookie is set to true later", () => {
    analyticsInstance.init({
      apiKey: "***",
      appId: "XXX"
    });

    analyticsInstance.setUserToken(`anonymous-${createUUID()}`);

    analyticsInstance.init({
      partial: true,
      useCookie: true
    });

    expect(document.cookie).toEqual(
      expect.stringMatching(/^_ALGOLIA=anonymous-/)
    );
  });
  it("should replace existing options when called again", () => {
    analyticsInstance.init({
      apiKey: "apiKey1",
      appId: "appId1",
      region: "de",
      userHasOptedOut: true,
      useCookie: true,
      cookieDuration: 100,
      userToken: "myUserToken"
    });

    expect(analyticsInstance._appId).toBe("appId1");
    expect(analyticsInstance._apiKey).toBe("apiKey1");
    expect(analyticsInstance._region).toBe("de");
    expect(analyticsInstance._userHasOptedOut).toBe(true);
    expect(analyticsInstance._useCookie).toBe(true);
    expect(analyticsInstance._cookieDuration).toBe(100);
    expect(analyticsInstance._userToken).toBe("myUserToken");
    expect(analyticsInstance._endpointOrigin).toBe(
      "https://insights.de.algolia.io"
    );

    analyticsInstance.init({ apiKey: "apiKey2", appId: "appId2" });

    expect(analyticsInstance._appId).toBe("appId2");
    expect(analyticsInstance._apiKey).toBe("apiKey2");
    expect(analyticsInstance._region).toBe(undefined);
    expect(analyticsInstance._userHasOptedOut).toBe(false);
    expect(analyticsInstance._useCookie).toBe(false);
    expect(analyticsInstance._cookieDuration).toBe(15552000000);
    // Custom user token isn't reset on `init` if not provided
    expect(analyticsInstance._userToken).toBe("myUserToken");
    expect(analyticsInstance._endpointOrigin).toBe(
      "https://insights.algolia.io"
    );
  });
  it("should not merge with previous options when `partial` is `false`", () => {
    analyticsInstance.init({
      apiKey: "apiKey1",
      appId: "appId1",
      region: "de",
      userHasOptedOut: true,
      useCookie: true,
      cookieDuration: 100,
      userToken: "myUserToken"
    });

    expect(analyticsInstance._appId).toBe("appId1");
    expect(analyticsInstance._apiKey).toBe("apiKey1");
    expect(analyticsInstance._region).toBe("de");
    expect(analyticsInstance._userHasOptedOut).toBe(true);
    expect(analyticsInstance._useCookie).toBe(true);
    expect(analyticsInstance._cookieDuration).toBe(100);
    expect(analyticsInstance._userToken).toBe("myUserToken");
    expect(analyticsInstance._endpointOrigin).toBe(
      "https://insights.de.algolia.io"
    );

    analyticsInstance.init({
      apiKey: "apiKey2",
      appId: "appId2",
      partial: false
    });

    expect(analyticsInstance._appId).toBe("appId2");
    expect(analyticsInstance._apiKey).toBe("apiKey2");
    expect(analyticsInstance._region).toBe(undefined);
    expect(analyticsInstance._userHasOptedOut).toBe(false);
    expect(analyticsInstance._useCookie).toBe(false);
    expect(analyticsInstance._cookieDuration).toBe(15552000000);
    // The user token isn't reset on `init` when not provided
    expect(analyticsInstance._userToken).toBe("myUserToken");
    expect(analyticsInstance._endpointOrigin).toBe(
      "https://insights.algolia.io"
    );
  });
  it("should merge with previous options when `partial` is `true`", () => {
    analyticsInstance.init({
      apiKey: "apiKey1",
      appId: "appId1",
      region: "de",
      userHasOptedOut: true,
      useCookie: true,
      cookieDuration: 100,
      userToken: "myUserToken"
    });

    expect(analyticsInstance._appId).toBe("appId1");
    expect(analyticsInstance._apiKey).toBe("apiKey1");
    expect(analyticsInstance._region).toBe("de");
    expect(analyticsInstance._userHasOptedOut).toBe(true);
    expect(analyticsInstance._useCookie).toBe(true);
    expect(analyticsInstance._cookieDuration).toBe(100);
    expect(analyticsInstance._userToken).toBe("myUserToken");
    expect(analyticsInstance._endpointOrigin).toBe(
      "https://insights.de.algolia.io"
    );

    analyticsInstance.init({
      apiKey: "apiKey2",
      appId: "appId2",
      partial: true
    });

    expect(analyticsInstance._appId).toBe("appId2");
    expect(analyticsInstance._apiKey).toBe("apiKey2");
    expect(analyticsInstance._region).toBe("de");
    expect(analyticsInstance._userHasOptedOut).toBe(true);
    expect(analyticsInstance._useCookie).toBe(true);
    expect(analyticsInstance._cookieDuration).toBe(100);
    expect(analyticsInstance._userToken).toBe("myUserToken");
    expect(analyticsInstance._endpointOrigin).toBe(
      "https://insights.de.algolia.io"
    );

    analyticsInstance.init({
      appId: "appId2",
      partial: true
    });

    expect(analyticsInstance._appId).toBe("appId2");
    expect(analyticsInstance._apiKey).toBe("apiKey2");

    analyticsInstance.init({
      host: "https://example.com",
      partial: true
    });

    expect(analyticsInstance._endpointOrigin).toBe("https://example.com");
  });

  describe("callback for userToken", () => {
    describe("immediate: true", () => {
      it("should trigger callback when userToken is set with cookie support", () => {
        const supportsCookies = jest
          .spyOn(utils, "supportsCookies")
          .mockReturnValue(true);

        analyticsInstance.init({
          apiKey: "***",
          appId: "XXX",
          region: "de",
          useCookie: true
        });
        // Because cookie is enabled, anonymous token must be generated already.
        expect(analyticsInstance._userToken).toBeTruthy();
        expect(analyticsInstance._userToken?.toString().length).toBeGreaterThan(
          0
        );
        const callback = jest.fn();
        analyticsInstance.onUserTokenChange(callback, { immediate: true });
        expect(callback).toHaveBeenCalledWith(analyticsInstance._userToken); // anonymous user token
        expect(callback).toHaveBeenCalledTimes(1);

        analyticsInstance.setUserToken("abc");
        expect(callback).toHaveBeenCalledWith("abc"); // explicit user token
        supportsCookies.mockRestore();
      });

      it("should trigger callback when userToken is set without cookie support", () => {
        const supportsCookies = jest
          .spyOn(utils, "supportsCookies")
          .mockReturnValue(false);

        analyticsInstance.init({ apiKey: "***", appId: "XXX", region: "de" });
        const callback = jest.fn();
        analyticsInstance.onUserTokenChange(callback, { immediate: true });
        expect(callback).toHaveBeenCalledWith(undefined);
        expect(callback).toHaveBeenCalledTimes(1);

        analyticsInstance.setUserToken("abc");
        expect(callback).toHaveBeenCalledWith("abc");
        expect(callback).toHaveBeenCalledTimes(2);
        supportsCookies.mockRestore();
      });
    });

    describe("immediate: false", () => {
      it("should trigger callback when userToken is set", () => {
        analyticsInstance.init({ apiKey: "***", appId: "XXX", region: "de" });
        analyticsInstance.setUserToken("abc");

        const callback = jest.fn();
        analyticsInstance.onUserTokenChange(callback);
        expect(callback).toHaveBeenCalledTimes(0);

        analyticsInstance.setUserToken("def");
        expect(callback).toHaveBeenCalledWith("def");
        expect(callback).toHaveBeenCalledTimes(1);
      });

      it("is triggered by setAnonymousUserToken", () => {
        analyticsInstance.init({ apiKey: "***", appId: "XXX", region: "de" });

        const callback = jest.fn();
        analyticsInstance.onUserTokenChange(callback);
        expect(callback).toHaveBeenCalledTimes(0);

        analyticsInstance.setAnonymousUserToken();
        expect(callback).toHaveBeenCalledWith(
          expect.stringMatching(/^anonymous-[-\w]+$/)
        );
        expect(callback).toHaveBeenCalledTimes(1);
      });
    });

    describe("nullish or invalid callback", () => {
      it("should not throw an exception when setting nullish callback", () => {
        analyticsInstance.init({ apiKey: "***", appId: "XXX", region: "de" });
        analyticsInstance.setUserToken("abc");

        expect(() => {
          analyticsInstance.onUserTokenChange(undefined);
        }).not.toThrow();

        expect(() => {
          analyticsInstance.onUserTokenChange(undefined, { immediate: true });
        }).not.toThrow();
      });

      it("should not throw an exception when setting user token after setting invalid callback", () => {
        analyticsInstance.init({ apiKey: "***", appId: "XXX", region: "de" });
        // @ts-expect-error wrong parameter
        analyticsInstance.onUserTokenChange("this is not a function");

        expect(() => {
          analyticsInstance.setUserToken("abc");
        }).not.toThrow();
      });
    });
  });

  describe("userToken param", () => {
    let setUserToken: jest.SpyInstance<
      number | string,
      [userToken: number | string]
    >;
    let setAnonymousUserToken: jest.SpyInstance<
      void,
      [inMemory?: boolean | undefined]
    >;
    beforeEach(() => {
      setUserToken = jest.spyOn(analyticsInstance, "setUserToken");
      setAnonymousUserToken = jest.spyOn(
        analyticsInstance,
        "setAnonymousUserToken"
      );
    });

    afterEach(() => {
      setUserToken.mockRestore();
      setAnonymousUserToken.mockRestore();
    });

    it("should set userToken", () => {
      analyticsInstance.init({ apiKey: "***", appId: "XXX", userToken: "abc" });
      expect(setUserToken).toHaveBeenCalledTimes(1);
      expect(setUserToken).toHaveBeenCalledWith("abc");
    });

    it("shouldn't set anonymous user token to cookie", () => {
      analyticsInstance.init({
        apiKey: "***",
        appId: "XXX",
        userToken: "abc",
        useCookie: true
      });
      expect(setUserToken).toHaveBeenCalledTimes(1);
      expect(setUserToken).toHaveBeenCalledWith("abc");

      expect(setAnonymousUserToken).not.toHaveBeenCalled();
    });

    it("can set userToken manually afterwards", (done) => {
      expect.assertions(3);
      analyticsInstance.init({ apiKey: "***", appId: "XXX", userToken: "abc" });
      analyticsInstance.setUserToken("def");
      expect(setUserToken).toHaveBeenCalledTimes(2);
      expect(setUserToken).toHaveBeenLastCalledWith("def");
      analyticsInstance.getUserToken(null, (_err, value) => {
        expect(value).toEqual("def");
        done();
      });
    });
  });

  describe("authenticatedUserToken param", () => {
    let setAuthenticatedUserToken: jest.SpyInstance<
      number | string | undefined,
      [authenticatedUserToken?: number | string]
    >;
    beforeEach(() => {
      setAuthenticatedUserToken = jest.spyOn(
        analyticsInstance,
        "setAuthenticatedUserToken"
      );
    });

    afterEach(() => {
      setAuthenticatedUserToken.mockRestore();
    });

    it("should set authenticatedUserToken", () => {
      expect.assertions(3);
      analyticsInstance.init({
        apiKey: "***",
        appId: "XXX",
        authenticatedUserToken: "abc"
      });
      expect(setAuthenticatedUserToken).toHaveBeenCalledTimes(1);
      expect(setAuthenticatedUserToken).toHaveBeenCalledWith("abc");
      analyticsInstance.getAuthenticatedUserToken(null, (_err, value) => {
        expect(value).toEqual("abc");
      });
    });

    it("can set authenticatedUserToken manually afterwards", (done) => {
      expect.assertions(3);
      analyticsInstance.init({
        apiKey: "***",
        appId: "XXX",
        authenticatedUserToken: "abc"
      });
      analyticsInstance.setAuthenticatedUserToken("def");
      expect(setAuthenticatedUserToken).toHaveBeenCalledTimes(2);
      expect(setAuthenticatedUserToken).toHaveBeenLastCalledWith("def");
      analyticsInstance.getAuthenticatedUserToken(null, (_err, value) => {
        expect(value).toEqual("def");
        done();
      });
    });

    it("can unset authenticatedUserToken afterwards", (done) => {
      expect.assertions(3);
      analyticsInstance.init({
        apiKey: "***",
        appId: "XXX",
        authenticatedUserToken: "abc"
      });
      analyticsInstance.setAuthenticatedUserToken(undefined);
      expect(setAuthenticatedUserToken).toHaveBeenCalledTimes(2);
      expect(setAuthenticatedUserToken).toHaveBeenLastCalledWith(undefined);
      analyticsInstance.getAuthenticatedUserToken(null, (_err, value) => {
        expect(value).toBeUndefined();
        done();
      });
    });

    it("should not set authenticatedUserToken if not passed", () => {
      expect.assertions(2);
      analyticsInstance.init({
        apiKey: "***",
        appId: "XXX"
      });
      expect(setAuthenticatedUserToken).toHaveBeenCalledTimes(0);
      analyticsInstance.getAuthenticatedUserToken(null, (_err, value) => {
        expect(value).toBeUndefined();
      });
    });
  });
});
