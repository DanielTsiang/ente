// @dart=2.9

import 'package:photos/events/files_updated_event.dart';

class LocalPhotosUpdatedEvent extends FilesUpdatedEvent {
  LocalPhotosUpdatedEvent(updatedFiles, {type})
      : super(updatedFiles, type: type ?? EventType.addedOrUpdated);
}
