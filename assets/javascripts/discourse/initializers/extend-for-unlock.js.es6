import { withPluginApi } from "discourse/lib/plugin-api";
import TopicStatus from "discourse/raw-views/topic-status";
import discourseComputed from "discourse-common/utils/decorators";
import loadScript from "discourse/lib/load-script";
import PreloadStore from "discourse/lib/preload-store";
import { ajax } from "discourse/lib/ajax";

const UNLOCK_URL = "https://unlock.radiant.capital/unlock.latest.min.js";

function reset() {
  window._redirectUrl = null;
  window._lock = null;
  window._wallet = null;
  window._transaction = null;
}

export default {
  name: "apply-unlock",

  initialize() {
    withPluginApi("0.11.2", (api) => {
      TopicStatus.reopen({
        @discourseComputed()
        statuses() {
          const results = this._super();

          if (this.topic.category?.lock) {
            results.push({
              openTag: "span",
              closeTag: "span",
              title: I18n.t("unlock.locked"),
              icon: this.topic.category.lock_icon,
            });
          }

          return results;
        },
      });

      api.modifyClass("model:post-stream", {
        errorLoading(result) {
          const { status } = result.jqXHR;
          const { lock, url } = result.jqXHR.responseJSON;

          if (status === 402 && lock) {
            if (api.container.lookup("current-user:main")) {
              window._redirectUrl = url;
              return loadScript(UNLOCK_URL).then(() => {
                window.unlockProtocolConfig = {
                  network: 42161,
                  locks: {
                    ["0x188ef9f717c4df8b2280a477117cacac42faf069"]: {}, // DAO-Author
                    ["0x97fe5ad7d2c3ddbb3998e8e914e0331b2ff9f2c4"]: {}, // DAO-Member
                  },
                  title: "Radiant DAO",
                  icon: "https://community.radiant.capital/uploads/default/original/1X/unlock-logo.svg",
                  callToAction: {
                    default: "Lock RDNT token",
                  },
                  referrer: "0x67dec02d34ea56bcf9f7c9b318298dda8c562080",
                };
                window.unlockProtocol.loadCheckoutModal();
              });
            } else {
              return api.container
                .lookup("route:application")
                .replaceWith("login");
            }
          } else {
            return this._super(result);
          }
        },
      });

      reset();

      const settings = {
        lock_network: 42161,
        lock_address: "0x97fe5ad7d2c3ddbb3998e8e914e0331b2ff9f2c4",
        lock_icon:
          "https://community.radiant.capital/uploads/default/original/1X/unlock-logo.svg",
        lock_call_to_action: "Lock RDNT token",
      };
      if (settings && settings.lock_address) {
        window.addEventListener("unlockProtocol.status", ({ detail }) => {
          const { state, locks } = detail;
          console.log("detail", detail);
          if (state === "unlocked" && window._wallet) {
            const data = {
              lock: window._lock || settings.lock_address,
              wallet: window._wallet,
            };

            if (window._transaction) data["transaction"] = window._transaction;

            let url;
            if (window._redirectUrl == null) url = document.location.origin;
            else url = document.location.origin + _redirectUrl;

            console.log("out of if case before reset", detail);
            reset();
            console.log("out of if case after reset", detail);
            if (locks.length == 2) {
              console.log("preimum", data);
              return ajax("/unlock_premium.json", { type: "POST", data }).then(
                () =>
                  (window.location.href = url + "?n=" + new Date().getTime()) // random number
              );
            } else if (locks.length == 1) {
              console.log("non-preimum", data);
              return ajax("/unlock.json", { type: "POST", data }).then(
                () =>
                  (window.location.href = url + "?n=" + new Date().getTime())
              );
            }
          }
        });

        window.addEventListener(
          "unlockProtocol.authenticated",
          ({ detail }) => {
            const { address } = detail;
            window._wallet = address;
          }
        );

        window.addEventListener(
          "unlockProtocol.transactionSent",
          ({ detail }) => {
            const { hash, lock } = detail;
            window._transaction = hash;
            window._lock = lock;
          }
        );

        window.addEventListener("unlockProtocol.closeModal", () => {
          console.log("checkout unlockprotocol close");
          window.location.replace("https://community.jdtesting.xyz/");
        });

        window.addEventListener("checkout.closeModal", () => {
          console.log("checkout closemodal");
          window.location.replace("https://community.jdtesting.xyz/c/locked/5");
        });

        window.unlockProtocolConfig = {
          network: 42161,
          locks: {
            ["0x188ef9f717c4df8b2280a477117cacac42faf069"]: {},  // DAO-Author
            ["0x97fe5ad7d2c3ddbb3998e8e914e0331b2ff9f2c4"]: {},  // DAO-Member
          },
          title: "Radiant DAO",
          icon: "https://community.radiant.capital/uploads/default/original/1X/unlock-logo.svg",
          callToAction: {
            default: "Lock RDNT token",
          },
          referrer: "0x67dec02d34ea56bcf9f7c9b318298dda8c562080",
        };

        // preload unlock script
        Ember.run.next(() => loadScript(UNLOCK_URL));
      }
    });
  },
};
