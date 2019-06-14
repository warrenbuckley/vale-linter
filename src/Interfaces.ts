/**
 * A severity from vale.
 */
type ValeSeverity = "suggestion" | "warning" | "error";

interface IValeErrorJSON {
    readonly Check: string;
    readonly Line: number;
    readonly Message: string;
    readonly Span: [number, number];
    readonly Severity: ValeSeverity;
}

/**
 * The type of Vale’s JSON output.
 */
interface IValeJSON {
    readonly [propName: string]: ReadonlyArray<IValeErrorJSON>;
}

interface IConfig{
  Vale: IConfigVale;
}

interface IConfigVale {
  Enabled: boolean;
  Paths: IConfigPaths;
  Success: IConfigMessage;
  Error: IConfigMessage;
  Warning: IConfigMessage;
}

interface IConfigPaths {
  Configuration: string;
  Styles: string;
}

interface IConfigMessage {
  Header: string;
  Message: string;
  ShowImage: boolean;
  ImageUrl: string;
}