// types/leaflet.d.ts
import 'leaflet';

declare module 'leaflet' {
    namespace Icon {
        interface DefaultIconOptions extends IconOptions {
            imagePath?: string;
        }
    }

    namespace DivIcon {
        interface DivIconOptions extends IconOptions {
            html?: string | HTMLElement;
            bgPos?: PointExpression;
        }
    }
}