import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:photos/core/event_bus.dart';
import 'package:photos/events/tab_changed_event.dart';
import "package:photos/generated/l10n.dart";
import 'package:photos/utils/toast_util.dart';

class CreateNewAlbumWidget extends StatelessWidget {
  const CreateNewAlbumWidget({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.background,
            boxShadow: [
              BoxShadow(
                blurRadius: 2,
                spreadRadius: 0,
                offset: const Offset(0, 0),
                color: Theme.of(context).iconTheme.color!.withOpacity(0.3),
              )
            ],
            borderRadius: BorderRadius.circular(4),
          ),
          child: Icon(
            Icons.add,
            color: Theme.of(context).iconTheme.color!.withOpacity(0.25),
          ),
        ),
      ),
      onTap: () async {
        await showToast(
          context,
          S.of(context).createAlbumActionHint,
          toastLength: Toast.LENGTH_LONG,
        );
        Bus.instance
            .fire(TabChangedEvent(0, TabChangedEventSource.collectionsPage));
      },
    );
  }
}
