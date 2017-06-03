import _ = require("lodash");
import { CloudKicker } from "cloudkicker";
import { URL } from "url";
import vm = require("vm");
import { stringEnum } from "../StringEnum";

const ScriptType = stringEnum(["ca", "lo"]);
type ScriptType = keyof typeof ScriptType;

export class KissMangaUrlDecrypter {
  protected cloudkicker: CloudKicker;
  protected baseURL: URL;

  private rawCryptoScript: string | undefined;
  private cryptoScript: vm.Script | undefined;

  private get sandbox(): vm.Context {
    return vm.createContext({
      alert: () => undefined, // Let's not and say we did...
      document: {},
      location: {
        reload: () => undefined, // Let's not and say we did...
      },
    });
  }

  private get vmOptions(): vm.ScriptOptions {
    return {
      timeout: 1000,
    };
  }

  constructor(baseURL: URL, cloudkicker?: CloudKicker, preloadScript: boolean = false) {
    this.baseURL = baseURL;
    this.cloudkicker = cloudkicker || new CloudKicker();
    if (preloadScript) { this.loadScripts(); }
  }

  public clearCache() {
    this.rawCryptoScript = undefined;
    this.cryptoScript = undefined;
  }

  public getWrapKA(body: any): Promise<(hash: string) => Promise<string>> {
    if (!_.isString(body)) { body = body.toString(); }
    const decryptionKeyMatch: RegExpMatchArray = body.match(/\>\s*(.+CryptoJS.SHA256\(chko\))/);
    if (!decryptionKeyMatch || decryptionKeyMatch.length < 2) {
      return Promise.reject(new Error("Unable to locate decryption key."));
    } else {
      const decryptionKey = decryptionKeyMatch[1];
      return this.loadScripts()
        .then((cryptoScript) => {
          const decryptionKeyScript = new vm.Script(decryptionKey);
          const decryptionKeySandbox = this.sandbox;
          cryptoScript.runInContext(decryptionKeySandbox, this.vmOptions);
          decryptionKeyScript.runInContext(decryptionKeySandbox, this.vmOptions);
          const wrapKA = (hash: string): Promise<string> => {
            return new Promise((resolve, reject) => {
              try {
                const decryptionKeyMap = (decryptionKeySandbox as { document: { [key: string]: string } }).document;
                if (!(hash in decryptionKeyMap)) {
                  vm.runInContext(`calcHash("${hash}");`, decryptionKeySandbox, this.vmOptions);
                }
                return resolve(decryptionKeyMap[hash]);
              } catch (error) { return reject(error); }
            });
          };
          return wrapKA;
        });
    }
  }

  private load(script: ScriptType) {
    const location = new URL(this.baseURL.href);
    location.pathname = `/Scripts/${script}.js`;
    return this.cloudkicker.get(location);
  }

  private loadScripts(): Promise<vm.Script> {
    if (this.cryptoScript) {
      return Promise.resolve(this.cryptoScript);
    } else {
      return Promise.all([
        this.load(ScriptType.ca),
        this.load(ScriptType.lo),
      ]).then((results) => {
        this.rawCryptoScript = results.map(({response}) => response.body.toString()).join(";");
        this.rawCryptoScript = [
          this.rawCryptoScript, "var document={}",
          "function calcHash(hash){if (!(hash in document)) {document[hash] = wrapKA(hash);}}",
        ].join(";");
        return this.cryptoScript = new vm.Script(this.rawCryptoScript);
      });
    }
  }
}
